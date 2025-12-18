/**
 * ML Service - Machine Learning Service sử dụng Isolation Forest
 * 
 * Service này quản lý ML model và training data
 */

const { IsolationForest } = require('./isolationForest');
const { extractFeatures } = require('./featureExtractor');
const Product = require('../../models/productModel');

let isolationForest = null;
let isTraining = false;
let trainingData = null;

/**
 * Load training data từ database
 * Lấy tất cả products có events để train model
 */
async function loadTrainingData() {
  try {
    const products = await Product.find({
      events: { $exists: true, $ne: [] },
      'events.1': { $exists: true } // Ít nhất 2 events
    }).limit(1000); // Giới hạn để không quá chậm

    const features = [];
    const productsData = [];

    for (const product of products) {
      const featureVector = extractFeatures(product);
      if (featureVector && featureVector.length > 0) {
        features.push(featureVector);
        productsData.push(product);
      }
    }

    console.log(`📊 Loaded ${features.length} products for ML training`);
    return { features, productsData };
  } catch (error) {
    console.error('Error loading training data:', error);
    return { features: [], productsData: [] };
  }
}

/**
 * Train Isolation Forest model
 */
async function trainModel() {
  if (isTraining) {
    console.log('⏳ Model đang được train, vui lòng đợi...');
    return false;
  }

  try {
    isTraining = true;
    console.log('🤖 Bắt đầu train Isolation Forest model...');

    const { features } = await loadTrainingData();

    if (features.length < 10) {
      console.log('⚠️ Không đủ dữ liệu để train (cần ít nhất 10 samples)');
      isTraining = false;
      return false;
    }

    // Tạo và train model
    isolationForest = new IsolationForest(100, 10); // 100 trees, max height 10
    isolationForest.fit(features);
    trainingData = features;

    console.log(`✅ Model đã được train với ${features.length} samples`);
    isTraining = false;
    return true;
  } catch (error) {
    console.error('Error training model:', error);
    isTraining = false;
    return false;
  }
}

/**
 * Predict anomaly score cho một product sử dụng ML model
 * @param {Object} product - Product object
 * @returns {Object} Prediction result với anomaly score và details
 */
function predictAnomaly(product) {
  if (!isolationForest) {
    console.log('⚠️ Model chưa được train, sử dụng rule-based fallback');
    return null;
  }

  try {
    const featureVector = extractFeatures(product);
    
    if (!featureVector || featureVector.length === 0) {
      return null;
    }

    // Predict anomaly score (0-1, càng gần 1 càng bất thường)
    const anomalyScore = isolationForest.predict(featureVector);
    
    // Convert sang scale 0-100
    const score100 = Math.round(anomalyScore * 100);

    return {
      mlScore: anomalyScore, // Score từ ML (0-1)
      score: score100, // Score trên scale 0-100
      method: 'isolation_forest',
      features: featureVector.length
    };
  } catch (error) {
    console.error('Error predicting with ML model:', error);
    return null;
  }
}

/**
 * Initialize model (train nếu chưa có)
 */
async function initializeModel() {
  if (!isolationForest) {
    await trainModel();
  }
}

/**
 * Retrain model với dữ liệu mới nhất
 */
async function retrainModel() {
  isolationForest = null;
  trainingData = null;
  return await trainModel();
}

module.exports = {
  trainModel,
  predictAnomaly,
  initializeModel,
  retrainModel,
  getModel: () => isolationForest,
  isModelReady: () => isolationForest !== null
};









