/**
 * AI Service - Xử lý phân tích AI cho products với Anomaly Detection
 * 
 * Hệ thống sử dụng 3 phương pháp:
 * 1. Isolation Forest (ML Model) - Phương pháp chính
 * 2. OpenAI GPT - Phân tích và giải thích thông minh
 * 3. Rule-based (Fallback) - Khi ML model chưa sẵn sàng
 * 
 * Phát hiện bất thường trong chuỗi cung ứng dựa trên:
 * - Thời gian giữa các events
 * - Khoảng cách địa điểm
 * - Sequence status bất thường
 * - Pattern learning từ dữ liệu lịch sử
 */

const mlService = require('./ml/mlService');
const openaiService = require('./openaiService');

/**
 * Phân tích thời gian giữa các events để phát hiện bất thường
 */
function analyzeTimePatterns(events) {
  if (!events || events.length < 2) {
    return { anomalies: [], score: 0 };
  }

  const anomalies = [];
  let totalTime = 0;
  const timeIntervals = [];

  // Tính thời gian giữa các events
  for (let i = 1; i < events.length; i++) {
    const timeDiff = events[i].timestamp - events[i - 1].timestamp;
    timeIntervals.push(timeDiff);
    totalTime += timeDiff;
  }

  const avgTime = totalTime / timeIntervals.length;
  const threshold = avgTime * 2; // Nếu thời gian > 2x trung bình hoặc < 0.1x trung bình

  timeIntervals.forEach((interval, index) => {
    const hours = interval / 3600;
    
    // Phát hiện thời gian quá nhanh (< 1 giờ giữa các events quan trọng)
    if (interval < 3600 && events[index + 1]?.eventType !== 'StatusUpdate') {
      anomalies.push({
        type: 'time_too_fast',
        severity: 'high',
        message: `Thời gian giữa ${events[index].eventType} và ${events[index + 1]?.eventType} quá ngắn (${hours.toFixed(2)} giờ)`,
        eventIndex: index + 1
      });
    }
    
    // Phát hiện thời gian quá chậm (> 30 ngày)
    if (interval > 2592000) {
      anomalies.push({
        type: 'time_too_slow',
        severity: 'medium',
        message: `Thời gian giữa ${events[index].eventType} và ${events[index + 1]?.eventType} quá dài (${(hours / 24).toFixed(1)} ngày)`,
        eventIndex: index + 1
      });
    }
    
    // Phát hiện outlier (quá khác biệt so với trung bình)
    if (interval > threshold || interval < avgTime * 0.1) {
      anomalies.push({
        type: 'time_outlier',
        severity: interval > threshold ? 'medium' : 'high',
        message: `Thời gian bất thường: ${hours.toFixed(2)} giờ (trung bình: ${(avgTime / 3600).toFixed(2)} giờ)`,
        eventIndex: index + 1
      });
    }
  });

  return { anomalies, score: anomalies.length > 0 ? Math.min(anomalies.length * 20, 100) : 0 };
}

/**
 * Phân tích sequence status để phát hiện bất thường
 */
function analyzeStatusSequence(events) {
  if (!events || events.length === 0) {
    return { anomalies: [], score: 0 };
  }

  const anomalies = [];
  const validSequences = {
    'Created': ['In Transit', 'Shipped', 'Approved'],
    'Approved': ['Shipped', 'In Transit'],
    'Shipped': ['In Transit', 'At Warehouse'],
    'In Transit': ['At Warehouse', 'In Customs', 'Delivered'],
    'At Warehouse': ['In Transit', 'In Customs', 'Delivered'],
    'In Customs': ['In Transit', 'Delivered'],
    'Delivered': ['Completed'],
    'Completed': []
  };

  // Kiểm tra sequence hợp lệ
  for (let i = 1; i < events.length; i++) {
    const prevEvent = events[i - 1];
    const currentEvent = events[i];
    
    // Tìm status từ event type hoặc details
    const prevStatus = extractStatusFromEvent(prevEvent);
    const currentStatus = extractStatusFromEvent(currentEvent);
    
    if (prevStatus && currentStatus && validSequences[prevStatus]) {
      if (!validSequences[prevStatus].includes(currentStatus) && currentStatus !== prevStatus) {
        anomalies.push({
          type: 'invalid_status_sequence',
          severity: 'high',
          message: `Chuyển trạng thái bất thường: ${prevStatus} → ${currentStatus}`,
          eventIndex: i
        });
      }
    }
  }

  // Phát hiện status quay ngược (ví dụ: Delivered → In Transit)
  const statusOrder = ['Created', 'Approved', 'Shipped', 'In Transit', 'At Warehouse', 'In Customs', 'Delivered', 'Completed'];
  for (let i = 1; i < events.length; i++) {
    const prevStatus = extractStatusFromEvent(events[i - 1]);
    const currentStatus = extractStatusFromEvent(events[i]);
    
    if (prevStatus && currentStatus) {
      const prevIndex = statusOrder.indexOf(prevStatus);
      const currentIndex = statusOrder.indexOf(currentStatus);
      
      if (prevIndex > currentIndex && currentIndex !== -1 && prevIndex !== -1) {
        anomalies.push({
          type: 'status_regression',
          severity: 'high',
          message: `Trạng thái quay ngược: ${prevStatus} → ${currentStatus}`,
          eventIndex: i
        });
      }
    }
  }

  return { anomalies, score: anomalies.length > 0 ? Math.min(anomalies.length * 25, 100) : 0 };
}

/**
 * Trích xuất status từ event
 */
function extractStatusFromEvent(event) {
  // Có thể lấy từ eventType hoặc details
  if (event.eventType) {
    const statusMap = {
      'Shipment': 'Shipped',
      'Warehouse': 'At Warehouse',
      'Customs': 'In Customs',
      'Delivery': 'Delivered',
      'StatusUpdate': null, // Cần parse từ details
      'AdminApproval': 'Approved'
    };
    return statusMap[event.eventType] || null;
  }
  return null;
}

/**
 * Phân tích địa điểm để phát hiện bất thường (đơn giản hóa)
 */
function analyzeLocationPatterns(events) {
  if (!events || events.length < 2) {
    return { anomalies: [], score: 0 };
  }

  const anomalies = [];
  const locations = events.map(e => e.location).filter(loc => loc);

  // Phát hiện địa điểm trùng lặp liên tiếp (có thể là lỗi)
  for (let i = 1; i < locations.length; i++) {
    if (locations[i] === locations[i - 1] && events[i].eventType !== events[i - 1].eventType) {
      anomalies.push({
        type: 'duplicate_location',
        severity: 'low',
        message: `Địa điểm trùng lặp: ${locations[i]}`,
        eventIndex: i
      });
    }
  }

  // Phát hiện địa điểm không hợp lý (ví dụ: từ Việt Nam sang Mỹ trong 1 giờ)
  // Đơn giản hóa: chỉ kiểm tra nếu có thông tin đầy đủ
  for (let i = 1; i < events.length; i++) {
    const timeDiff = events[i].timestamp - events[i - 1].timestamp;
    const hours = timeDiff / 3600;
    
    // Nếu có quốc gia khác nhau và thời gian quá ngắn
    if (hours < 2 && locations[i] && locations[i - 1]) {
      const country1 = extractCountry(locations[i - 1]);
      const country2 = extractCountry(locations[i]);
      
      if (country1 && country2 && country1 !== country2) {
        anomalies.push({
          type: 'impossible_travel',
          severity: 'high',
          message: `Không thể di chuyển từ ${locations[i - 1]} đến ${locations[i]} trong ${hours.toFixed(2)} giờ`,
          eventIndex: i
        });
      }
    }
  }

  return { anomalies, score: anomalies.length > 0 ? Math.min(anomalies.length * 15, 100) : 0 };
}

/**
 * Trích xuất quốc gia từ địa điểm (đơn giản)
 */
function extractCountry(location) {
  if (!location) return null;
  const countryKeywords = {
    'Vietnam': ['Vietnam', 'Việt Nam', 'VN', 'Ho Chi Minh', 'Hanoi'],
    'USA': ['USA', 'United States', 'America', 'New York', 'Los Angeles'],
    'China': ['China', 'Trung Quốc', 'Beijing', 'Shanghai'],
    'Japan': ['Japan', 'Nhật Bản', 'Tokyo'],
    'Korea': ['Korea', 'Hàn Quốc', 'Seoul']
  };
  
  for (const [country, keywords] of Object.entries(countryKeywords)) {
    if (keywords.some(keyword => location.includes(keyword))) {
      return country;
    }
  }
  return null;
}

/**
 * Phân tích tổng hợp với Isolation Forest logic (simplified)
 */
function calculateAnomalyScore(timeAnalysis, statusAnalysis, locationAnalysis) {
  const timeScore = timeAnalysis.score;
  const statusScore = statusAnalysis.score;
  const locationScore = locationAnalysis.score;
  
  // Weighted average
  const totalScore = (timeScore * 0.4) + (statusScore * 0.4) + (locationScore * 0.2);
  
  // Combine all anomalies
  const allAnomalies = [
    ...timeAnalysis.anomalies,
    ...statusAnalysis.anomalies,
    ...locationAnalysis.anomalies
  ];
  
  return {
    score: Math.min(totalScore, 100),
    anomalies: allAnomalies,
    severity: totalScore > 70 ? 'high' : totalScore > 40 ? 'medium' : 'low'
  };
}

/**
 * Phân tích sản phẩm với Anomaly Detection (AI thực sự)
 * 
 * Quy trình:
 * 1. Thử dùng ML model (Isolation Forest) - nếu có
 * 2. Fallback về rule-based nếu ML chưa sẵn sàng
 * 3. Tích hợp OpenAI để có phân tích thông minh hơn (optional)
 */
async function analyzeProduct(product) {
  try {
    console.log(`🤖 [AI] Analyzing product ${product.id} for anomalies...`);
    
    const events = product.events || [];
    
    if (events.length < 2) {
      return {
        authenticity: 'Verified',
        confidence: 100,
        analysis: 'Sản phẩm chưa có đủ events để phân tích.',
        timestamp: Date.now(),
        anomalyScore: 0,
        anomalies: [],
        severity: 'low',
        method: 'insufficient_data'
      };
    }

    let mlResult = null;
    let ruleBasedResult = null;
    let openaiAnalysis = null;
    let finalScore = 0;
    let method = 'rule_based';

    // Bước 1: Thử dùng ML model (Isolation Forest)
    try {
      await mlService.initializeModel();
      if (mlService.isModelReady()) {
        mlResult = mlService.predictAnomaly(product);
        if (mlResult) {
          finalScore = mlResult.score;
          method = 'isolation_forest';
          console.log(`✅ [ML] Isolation Forest prediction: ${mlResult.score}/100`);
        }
      }
    } catch (mlError) {
      console.log('⚠️ [ML] ML model error, using fallback:', mlError.message);
    }

    // Bước 2: Rule-based analysis (luôn chạy để có anomalies chi tiết)
    const timeAnalysis = analyzeTimePatterns(events);
    const statusAnalysis = analyzeStatusSequence(events);
    const locationAnalysis = analyzeLocationPatterns(events);
    ruleBasedResult = calculateAnomalyScore(timeAnalysis, statusAnalysis, locationAnalysis);

    // Bước 3: Kết hợp kết quả
    // Nếu có ML result, ưu tiên ML (70%) + Rule-based (30%)
    // Nếu không có ML, chỉ dùng Rule-based
    if (mlResult && mlResult.score > 0) {
      finalScore = Math.round((mlResult.score * 0.7) + (ruleBasedResult.score * 0.3));
      method = 'hybrid_ml_rule';
    } else {
      finalScore = ruleBasedResult.score;
      method = 'rule_based';
    }

    // Bước 4: Tích hợp OpenAI (optional, nếu có API key)
    try {
      if (openaiService.isAvailable()) {
        openaiAnalysis = await openaiService.analyzeWithOpenAI(product, {
          score: finalScore,
          method: method
        });
        console.log('✅ [OpenAI] GPT analysis completed');
      }
    } catch (openaiError) {
      console.log('⚠️ [OpenAI] OpenAI analysis failed:', openaiError.message);
    }

    // Xác định authenticity dựa trên final score
    let authenticity = 'Verified';
    let confidence = 100;
    
    if (finalScore > 70) {
      authenticity = 'Suspicious';
      confidence = Math.max(100 - finalScore, 20);
    } else if (finalScore > 40) {
      authenticity = 'Warning';
      confidence = Math.max(100 - finalScore, 50);
    } else {
      confidence = Math.max(100 - finalScore, 80);
    }

    // Tạo analysis message
    let analysis = `Phân tích sản phẩm #${product.id} (${method}): `;
    
    if (openaiAnalysis && openaiAnalysis.summary) {
      analysis = openaiAnalysis.summary;
    } else if (ruleBasedResult.anomalies.length === 0) {
      analysis += 'Không phát hiện bất thường. Sản phẩm có chuỗi cung ứng hợp lệ.';
    } else {
      analysis += `Phát hiện ${ruleBasedResult.anomalies.length} dấu hiệu bất thường:\n`;
      ruleBasedResult.anomalies.slice(0, 3).forEach((anomaly, idx) => {
        analysis += `${idx + 1}. ${anomaly.message}\n`;
      });
      if (ruleBasedResult.anomalies.length > 3) {
        analysis += `... và ${ruleBasedResult.anomalies.length - 3} dấu hiệu khác.`;
      }
    }

    const aiResult = {
      authenticity: authenticity,
      confidence: Math.round(confidence),
      analysis: analysis,
      timestamp: Date.now(),
      anomalyScore: finalScore,
      anomalies: ruleBasedResult.anomalies,
      severity: finalScore > 70 ? 'high' : finalScore > 40 ? 'medium' : 'low',
      method: method,
      mlScore: mlResult ? mlResult.mlScore : null,
      openaiAnalysis: openaiAnalysis || null,
      details: {
        timeAnalysis: {
          score: Math.round(timeAnalysis.score),
          anomalyCount: timeAnalysis.anomalies.length
        },
        statusAnalysis: {
          score: Math.round(statusAnalysis.score),
          anomalyCount: statusAnalysis.anomalies.length
        },
        locationAnalysis: {
          score: Math.round(locationAnalysis.score),
          anomalyCount: locationAnalysis.anomalies.length
        },
        mlModel: mlResult ? {
          score: mlResult.score,
          mlScore: mlResult.mlScore,
          features: mlResult.features
        } : null
      }
    };
    
    console.log(`✅ [AI] Analysis completed for product ${product.id}. Score: ${finalScore}/100 (${method})`);
    
    return aiResult;
  } catch (error) {
    console.error('❌ [AI] Error in AI analysis:', error);
    throw error;
  }
}

async function updateProductWithAIResult(productId, aiResult, analysisKey = 0) {
  try {
    // TODO: Gọi contract để lưu AI result
    // const contract = require('../app').contract;
    // await contract.methods.updateAiResult(productId, analysisKey, JSON.stringify(aiResult)).send({...});
    
    console.log(`AI result for product ${productId}:`, aiResult);
    return aiResult;
  } catch (error) {
    console.error('Error updating AI result:', error);
    throw error;
  }
}

/**
 * Initialize AI services (ML model và OpenAI)
 */
async function initializeAIServices() {
  try {
    console.log('🚀 Initializing AI services...');
    
    // Initialize ML model
    await mlService.initializeModel();
    
    // Initialize OpenAI (optional)
    openaiService.initializeOpenAI();
    
    console.log('✅ AI services initialized');
  } catch (error) {
    console.error('Error initializing AI services:', error);
  }
}

/**
 * Retrain ML model với dữ liệu mới nhất
 */
async function retrainMLModel() {
  try {
    console.log('🔄 Retraining ML model...');
    const success = await mlService.retrainModel();
    if (success) {
      console.log('✅ ML model retrained successfully');
    } else {
      console.log('⚠️ ML model retraining failed or insufficient data');
    }
    return success;
  } catch (error) {
    console.error('Error retraining ML model:', error);
    return false;
  }
}

module.exports = {
  analyzeProduct,
  updateProductWithAIResult,
  initializeAIServices,
  retrainMLModel,
  mlService,
  openaiService
};

