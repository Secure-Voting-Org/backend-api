const faceapi = require('face-api.js');
const canvas = require('canvas');
const path = require('path');

// Monkey patch for Node.js
const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

let modelsLoaded = false;

/**
 * Load models from the weights directory
 */
const loadModels = async () => {
    if (modelsLoaded) return;

    const MODEL_PATH = path.join(__dirname, '../models/face_weights');

    console.log(`[FaceService] Loading models from ${MODEL_PATH}...`);

    try {
        await Promise.all([
            faceapi.nets.ssdMobilenetv1.loadFromDisk(MODEL_PATH),
            faceapi.nets.faceLandmark68Net.loadFromDisk(MODEL_PATH),
            faceapi.nets.faceRecognitionNet.loadFromDisk(MODEL_PATH)
        ]);
        modelsLoaded = true;
        console.log('[FaceService] AI Models Loaded Successfully.');
    } catch (err) {
        console.error('[FaceService] Failed to load models:', err);
        throw err;
    }
};

/**
 * Extract face descriptor from a base64 image string
 * @param {string} base64Image - Base64 encoded image
 * @returns {Promise<number[]>} - 128-float descriptor array
 */
const getDescriptorFromBase64 = async (base64Image) => {
    await loadModels();

    try {
        // Create canvas image from base64
        // Ensure we strip the data:image/jpeg;base64, prefix if present
        const base64Data = base64Image.includes('base64,')
            ? base64Image.split('base64,')[1]
            : base64Image;

        const img = new Image();
        img.src = Buffer.from(base64Data, 'base64');

        // Detect single face and get landmarks and descriptor
        const detections = await faceapi.detectSingleFace(img)
            .withFaceLandmarks()
            .withFaceDescriptor();

        if (!detections) {
            console.warn('[FaceService] No face detected in the provided image.');
            return null;
        }

        // Convert Float32Array to standard array for JSON storage
        return Array.from(detections.descriptor);
    } catch (err) {
        console.error('[FaceService] Error processing image:', err);
        throw err;
    }
};

module.exports = {
    getDescriptorFromBase64,
    loadModels
};
