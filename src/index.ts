import 'reflect-metadata';
import express from 'express';
import app from './app';

// Initialize server
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
