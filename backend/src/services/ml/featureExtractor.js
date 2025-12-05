/**
 * Feature Extractor - Trích xuất features từ product events để đưa vào ML model
 * 
 * Mục đích: Chuyển đổi dữ liệu events thành feature vectors (số) để ML model có thể xử lý
 */

/**
 * Trích xuất features từ một product
 * @param {Object} product - Product object với events
 * @returns {Array} Feature vector (mảng số)
 */
function extractFeatures(product) {
  const events = product.events || [];
  
  if (events.length === 0) {
    return null;
  }

  const features = [];

  // 1. Time-based features (5 features)
  const timeFeatures = extractTimeFeatures(events);
  features.push(...timeFeatures);

  // 2. Status-based features (10 features)
  const statusFeatures = extractStatusFeatures(events);
  features.push(...statusFeatures);

  // 3. Location-based features (5 features)
  const locationFeatures = extractLocationFeatures(events);
  features.push(...locationFeatures);

  // 4. Sequence-based features (5 features)
  const sequenceFeatures = extractSequenceFeatures(events);
  features.push(...sequenceFeatures);

  // 5. Statistical features (5 features)
  const statisticalFeatures = extractStatisticalFeatures(events);
  features.push(...statisticalFeatures);

  return features;
}

/**
 * Trích xuất time-based features
 */
function extractTimeFeatures(events) {
  if (events.length < 2) {
    return [0, 0, 0, 0, 0];
  }

  const timeIntervals = [];
  for (let i = 1; i < events.length; i++) {
    const timeDiff = events[i].timestamp - events[i - 1].timestamp;
    timeIntervals.push(timeDiff);
  }

  const hours = timeIntervals.map(t => t / 3600);
  const days = hours.map(h => h / 24);

  return [
    hours.length > 0 ? hours.reduce((a, b) => a + b, 0) / hours.length : 0, // Mean hours
    hours.length > 0 ? Math.min(...hours) : 0, // Min hours
    hours.length > 0 ? Math.max(...hours) : 0, // Max hours
    days.length > 0 ? days.filter(d => d > 30).length / days.length : 0, // Ratio > 30 days
    days.length > 0 ? days.filter(d => d < 0.1).length / days.length : 0 // Ratio < 0.1 days
  ];
}

/**
 * Trích xuất status-based features
 */
function extractStatusFeatures(events) {
  const statusOrder = {
    'Created': 0,
    'Approved': 1,
    'Shipped': 2,
    'In Transit': 3,
    'At Warehouse': 4,
    'In Customs': 5,
    'Delivered': 6,
    'Completed': 7
  };

  const statuses = events.map(e => extractStatusFromEvent(e)).filter(s => s);
  const statusNums = statuses.map(s => statusOrder[s] !== undefined ? statusOrder[s] : -1);

  let invalidTransitions = 0;
  let regressions = 0;
  let uniqueStatuses = new Set(statuses).size;

  for (let i = 1; i < statusNums.length; i++) {
    if (statusNums[i] !== -1 && statusNums[i - 1] !== -1) {
      if (statusNums[i] < statusNums[i - 1]) {
        regressions++;
      }
      if (Math.abs(statusNums[i] - statusNums[i - 1]) > 2) {
        invalidTransitions++;
      }
    }
  }

  return [
    statuses.length, // Total status changes
    uniqueStatuses, // Unique statuses
    invalidTransitions, // Invalid transitions
    regressions, // Status regressions
    statusNums.length > 0 ? statusNums.reduce((a, b) => a + b, 0) / statusNums.length : 0, // Mean status index
    statusNums.length > 0 ? Math.max(...statusNums) : 0, // Max status
    statusNums.length > 0 ? Math.min(...statusNums) : 0, // Min status
    statusNums.length > 1 ? Math.max(...statusNums) - Math.min(...statusNums) : 0, // Status range
    statuses.filter(s => s === 'Delivered').length, // Delivery count
    statuses.filter(s => s === 'Created').length // Creation count
  ];
}

/**
 * Trích xuất location-based features
 */
function extractLocationFeatures(events) {
  const locations = events.map(e => e.location).filter(loc => loc);
  
  if (locations.length === 0) {
    return [0, 0, 0, 0, 0];
  }

  let duplicateLocations = 0;
  let countryChanges = 0;
  const countries = new Set();

  for (let i = 1; i < locations.length; i++) {
    if (locations[i] === locations[i - 1]) {
      duplicateLocations++;
    }
    
    const country1 = extractCountry(locations[i - 1]);
    const country2 = extractCountry(locations[i]);
    
    if (country1 && country2 && country1 !== country2) {
      countryChanges++;
      countries.add(country1);
      countries.add(country2);
    }
  }

  return [
    locations.length, // Total locations
    new Set(locations).size, // Unique locations
    duplicateLocations, // Duplicate consecutive locations
    countryChanges, // Country changes
    countries.size // Unique countries
  ];
}

/**
 * Trích xuất sequence-based features
 */
function extractSequenceFeatures(events) {
  if (events.length < 2) {
    return [0, 0, 0, 0, 0];
  }

  const eventTypes = events.map(e => e.eventType || 'Unknown');
  const uniqueEventTypes = new Set(eventTypes).size;
  
  let rapidChanges = 0;
  let sameTypeConsecutive = 0;

  for (let i = 1; i < events.length; i++) {
    const timeDiff = events[i].timestamp - events[i - 1].timestamp;
    if (timeDiff < 3600) { // < 1 hour
      rapidChanges++;
    }
    if (eventTypes[i] === eventTypes[i - 1]) {
      sameTypeConsecutive++;
    }
  }

  return [
    events.length, // Total events
    uniqueEventTypes, // Unique event types
    rapidChanges, // Rapid changes (< 1 hour)
    sameTypeConsecutive, // Same type consecutive
    events.length > 0 ? rapidChanges / events.length : 0 // Rapid change ratio
  ];
}

/**
 * Trích xuất statistical features
 */
function extractStatisticalFeatures(events) {
  if (events.length < 2) {
    return [0, 0, 0, 0, 0];
  }

  const timeIntervals = [];
  for (let i = 1; i < events.length; i++) {
    timeIntervals.push(events[i].timestamp - events[i - 1].timestamp);
  }

  const hours = timeIntervals.map(t => t / 3600);
  const mean = hours.reduce((a, b) => a + b, 0) / hours.length;
  const variance = hours.reduce((sum, h) => sum + Math.pow(h - mean, 2), 0) / hours.length;
  const stdDev = Math.sqrt(variance);

  return [
    mean, // Mean interval
    stdDev, // Standard deviation
    variance, // Variance
    hours.filter(h => h > mean + 2 * stdDev).length, // Outliers (> 2 std dev)
    hours.filter(h => h < mean - 2 * stdDev).length // Outliers (< -2 std dev)
  ];
}

/**
 * Trích xuất status từ event
 */
function extractStatusFromEvent(event) {
  if (event.eventType) {
    const statusMap = {
      'Shipment': 'Shipped',
      'Warehouse': 'At Warehouse',
      'Customs': 'In Customs',
      'Delivery': 'Delivered',
      'AdminApproval': 'Approved'
    };
    return statusMap[event.eventType] || null;
  }
  return null;
}

/**
 * Trích xuất quốc gia từ địa điểm
 */
function extractCountry(location) {
  if (!location) return null;
  const countryKeywords = {
    'Vietnam': ['Vietnam', 'Việt Nam', 'VN', 'Ho Chi Minh', 'Hanoi', 'Hồ Chí Minh', 'Hà Nội'],
    'USA': ['USA', 'United States', 'America', 'New York', 'Los Angeles', 'US'],
    'China': ['China', 'Trung Quốc', 'Beijing', 'Shanghai', 'CN'],
    'Japan': ['Japan', 'Nhật Bản', 'Tokyo', 'JP'],
    'Korea': ['Korea', 'Hàn Quốc', 'Seoul', 'KR']
  };
  
  for (const [country, keywords] of Object.entries(countryKeywords)) {
    if (keywords.some(keyword => location.toLowerCase().includes(keyword.toLowerCase()))) {
      return country;
    }
  }
  return null;
}

module.exports = {
  extractFeatures,
  extractTimeFeatures,
  extractStatusFeatures,
  extractLocationFeatures,
  extractSequenceFeatures,
  extractStatisticalFeatures
};




