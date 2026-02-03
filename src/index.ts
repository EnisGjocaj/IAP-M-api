import 'reflect-metadata';
import express from 'express';
import app from './app';

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

requireEnv('GROQ_API_KEY');
requireEnv('CLOUDINARY_CLOUD_NAME');
requireEnv('CLOUDINARY_API_KEY');
requireEnv('CLOUDINARY_API_SECRET');

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
