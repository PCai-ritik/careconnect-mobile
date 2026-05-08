// index.js
import './polyfill';        // 1. Force the DOMException polyfill FIRST
import 'expo-router/entry'; // 2. Then boot up the rest of the application