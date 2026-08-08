import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';

// Load .env from the root directory
// Removed check for CLOUDINARY_URL

// Explicitly configure from env var
cloudinary.config({
  api_key: '327326726199911',
  api_secret: '1NRe5u5ZEjfUEbzmWSFY_VZpxrE',
  cloud_name: 'dwp9jwa3y',
  secure: true
});

const VDOS_DIR = path.resolve(process.cwd(), '../../vdos');
const OUTPUT_FILE = path.resolve(process.cwd(), '../../video_urls.json');

async function uploadVideos() {
  try {
    const files = await fs.readdir(VDOS_DIR);
    const videoFiles = files.filter(f => f.endsWith('.mp4'));
    
    console.log(`Found ${videoFiles.length} videos to upload.`);
    const results = {};

    for (const file of videoFiles) {
      const filePath = path.join(VDOS_DIR, file);
      console.log(`Uploading ${file}...`);
      
      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_large(filePath, {
          resource_type: "video",
          folder: "iaudit_videos",
          chunk_size: 20000000 // 20MB chunks
        }, (error, result) => {
          if (error) reject(error);
          else resolve(result);
        });
      });
      
      results[file] = result.secure_url;
      console.log(`Uploaded ${file} -> ${result.secure_url}`);
    }

    await fs.writeFile(OUTPUT_FILE, JSON.stringify(results, null, 2));
    console.log(`Saved results to ${OUTPUT_FILE}`);

  } catch (error) {
    console.error("Error uploading videos:", error);
  }
}

uploadVideos();
