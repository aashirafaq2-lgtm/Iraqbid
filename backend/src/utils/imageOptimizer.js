import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

/**
 * Image Optimizer Utility
 * Compresses and generates thumbnails for uploaded images to save bandwidth
 */
export const ImageOptimizer = {
    /**
     * Optimize an image buffer
     * @param {Buffer} buffer - Original image buffer
     * @param {Object} options - Optimization options
     * @returns {Promise<Buffer>} - Optimized image buffer
     */
    async optimize(buffer, options = {}) {
        try {
            const {
                width = 1200,
                height = null,
                quality = 80,
                format = 'webp'
            } = options;

            let pipeline = sharp(buffer);

            // Resize if width is provided (maintaining aspect ratio if height is null)
            if (width || height) {
                pipeline = pipeline.resize(width, height, {
                    fit: 'inside',
                    withoutEnlargement: true
                });
            }

            // Convert to efficient format (WebP is best for mobile)
            if (format === 'webp') {
                pipeline = pipeline.webp({ quality });
            } else if (format === 'jpeg' || format === 'jpg') {
                pipeline = pipeline.jpeg({ quality, mozjpeg: true });
            } else if (format === 'png') {
                pipeline = pipeline.png({ quality, palette: true });
            }

            return await pipeline.toBuffer();
        } catch (error) {
            console.error('❌ [ImageOptimizer] Error:', error.message);
            return buffer; // Return original buffer if optimization fails
        }
    },

    /**
     * Generate a thumbnail from an image buffer
     * @param {Buffer} buffer - Original image buffer
     * @returns {Promise<Buffer>} - Thumbnail image buffer
     */
    async generateThumbnail(buffer) {
        return this.optimize(buffer, {
            width: 300,
            quality: 60,
            format: 'webp'
        });
    }
};
