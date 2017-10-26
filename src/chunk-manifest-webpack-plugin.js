/**
 * This dependency plugin is a fork of: 
 * chunk-manifest-webpack-plugin (https://github.com/soundcloud/chunk-manifest-webpack-plugin)
 * 
 * inline-chunk-manifest-html-webpack-plugin already enables inlining webpack's chunk manifest,
 * and therefor has been extracted.
 */

"use strict";

const RawSource = require("webpack-sources").RawSource;

class ChunkManifestPlugin {
  constructor(options) {
    options = options || {};
    this.manifestFilename = options.filename || "manifest.json";
    this.manifestVariable = options.manifestVariable || "webpackManifest";
  }

  apply(compiler) {
    const manifestFilename = this.manifestFilename;
    const manifestVariable = this.manifestVariable;
    let oldChunkFilename;

    compiler.plugin("this-compilation", function(compilation) {
      const mainTemplate = compilation.mainTemplate;
      mainTemplate.plugin("require-ensure", function(source, chunk, hash) {
        const filename =
          this.outputOptions.chunkFilename || this.outputOptions.filename;

        if (filename) {
          const chunkManifest = [chunk].reduce(function registerChunk(
            manifest,
            c
          ) {
            if (c.id in manifest) return manifest;

            if (c.hasRuntime()) {
              manifest[c.id] = undefined;
            } else {
              const asyncAssets = mainTemplate.applyPluginsWaterfall(
                "asset-path",
                filename,
                {
                  hash: hash,
                  chunk: c
                }
              );

              manifest[c.id] = asyncAssets;
            }
            return c.chunks.reduce(registerChunk, manifest);
          },
          {});

          oldChunkFilename = this.outputOptions.chunkFilename;
          this.outputOptions.chunkFilename = "__CHUNK_MANIFEST__";
          // mark as asset for emitting
          compilation.assets[manifestFilename] = new RawSource(
            JSON.stringify(chunkManifest)
          );
        }

        return source;
      });
    });

    compiler.plugin("compilation", function(compilation) {
      compilation.mainTemplate.plugin("require-ensure", function(
        source,
        chunk,
        hash,
        chunkIdVariableName
      ) {
        if (oldChunkFilename) {
          this.outputOptions.chunkFilename = oldChunkFilename;
        }

        const updatedSource = source.replace(
          /"__CHUNK_MANIFEST__"/,
          `window["${manifestVariable}"][${chunkIdVariableName}]`
        );

        return updatedSource;
      });
    });
  }
}

module.exports = ChunkManifestPlugin;
