/**
 * Isolation Forest Algorithm Implementation
 * 
 * Isolation Forest là một thuật toán unsupervised learning để phát hiện anomalies.
 * Ý tưởng: Các điểm bất thường dễ bị "isolate" (cô lập) hơn các điểm bình thường.
 * 
 * Cách hoạt động:
 * 1. Xây dựng nhiều Isolation Trees (iTrees) ngẫu nhiên
 * 2. Mỗi tree phân chia dữ liệu ngẫu nhiên cho đến khi isolate được một điểm
 * 3. Điểm bất thường sẽ có path length ngắn hơn (dễ isolate hơn)
 * 4. Tính anomaly score dựa trên average path length qua tất cả trees
 */

/**
 * Isolation Tree Node
 */
class IsolationTreeNode {
  constructor() {
    this.left = null;
    this.right = null;
    this.splitAttribute = null;
    this.splitValue = null;
    this.size = 0;
  }
}

/**
 * Xây dựng một Isolation Tree
 * @param {Array} data - Dữ liệu training (mảng các feature vectors)
 * @param {Number} maxHeight - Chiều cao tối đa của tree
 * @param {Number} currentHeight - Chiều cao hiện tại
 * @returns {IsolationTreeNode}
 */
function buildIsolationTree(data, maxHeight, currentHeight = 0) {
  const node = new IsolationTreeNode();
  node.size = data.length;

  // Điều kiện dừng: chỉ còn 1 điểm hoặc đạt max height
  if (data.length <= 1 || currentHeight >= maxHeight) {
    return node;
  }

  // Chọn ngẫu nhiên một attribute để split
  const numFeatures = data[0].length;
  const randomAttribute = Math.floor(Math.random() * numFeatures);

  // Tìm min và max của attribute này
  const values = data.map(row => row[randomAttribute]);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);

  // Nếu min == max, không thể split
  if (minVal === maxVal) {
    return node;
  }

  // Chọn giá trị split ngẫu nhiên giữa min và max
  const splitValue = minVal + Math.random() * (maxVal - minVal);

  // Phân chia dữ liệu
  const leftData = data.filter(row => row[randomAttribute] < splitValue);
  const rightData = data.filter(row => row[randomAttribute] >= splitValue);

  // Nếu một trong hai phần rỗng, dừng lại
  if (leftData.length === 0 || rightData.length === 0) {
    return node;
  }

  // Gán thông tin split
  node.splitAttribute = randomAttribute;
  node.splitValue = splitValue;

  // Đệ quy xây dựng left và right subtree
  node.left = buildIsolationTree(leftData, maxHeight, currentHeight + 1);
  node.right = buildIsolationTree(rightData, maxHeight, currentHeight + 1);

  return node;
}

/**
 * Tính path length của một điểm trong tree
 * @param {Array} point - Feature vector của điểm cần kiểm tra
 * @param {IsolationTreeNode} tree - Isolation tree
 * @param {Number} currentPathLength - Độ dài path hiện tại
 * @returns {Number} Path length
 */
function pathLength(point, tree, currentPathLength = 0) {
  // Nếu là leaf node hoặc chỉ còn 1 điểm
  if (tree.left === null && tree.right === null) {
    // C(n) là average path length cho n điểm
    const c = tree.size > 1 
      ? 2 * (Math.log(tree.size - 1) + 0.5772156649) - (2 * (tree.size - 1) / tree.size)
      : 0;
    return currentPathLength + c;
  }

  // Kiểm tra điều kiện split
  if (tree.splitAttribute === null) {
    return currentPathLength;
  }

  const attributeValue = point[tree.splitAttribute];
  
  if (attributeValue < tree.splitValue) {
    return pathLength(point, tree.left, currentPathLength + 1);
  } else {
    return pathLength(point, tree.right, currentPathLength + 1);
  }
}

/**
 * Isolation Forest Class
 */
class IsolationForest {
  constructor(numTrees = 100, maxHeight = 10) {
    this.numTrees = numTrees;
    this.maxHeight = maxHeight;
    this.trees = [];
    this.trainingData = null;
  }

  /**
   * Train Isolation Forest với dữ liệu
   * @param {Array} data - Training data (mảng các feature vectors)
   */
  fit(data) {
    if (!data || data.length === 0) {
      throw new Error('Training data is required');
    }

    this.trainingData = data;
    this.trees = [];

    // Xây dựng numTrees isolation trees
    for (let i = 0; i < this.numTrees; i++) {
      // Mỗi tree chỉ dùng một sample ngẫu nhiên (subsampling)
      const sampleSize = Math.min(256, data.length);
      const sampleIndices = [];
      for (let j = 0; j < sampleSize; j++) {
        sampleIndices.push(Math.floor(Math.random() * data.length));
      }
      const sample = sampleIndices.map(idx => data[idx]);

      const tree = buildIsolationTree(sample, this.maxHeight);
      this.trees.push(tree);
    }
  }

  /**
   * Dự đoán anomaly score cho một điểm
   * @param {Array} point - Feature vector của điểm cần kiểm tra
   * @returns {Number} Anomaly score (0-1, càng gần 1 càng bất thường)
   */
  predict(point) {
    if (this.trees.length === 0) {
      throw new Error('Model chưa được train. Gọi fit() trước.');
    }

    // Tính average path length qua tất cả trees
    let totalPathLength = 0;
    for (const tree of this.trees) {
      totalPathLength += pathLength(point, tree);
    }
    const avgPathLength = totalPathLength / this.trees.length;

    // Tính c(n) - average path length cho n điểm
    const n = this.trainingData.length;
    const c = n > 1 
      ? 2 * (Math.log(n - 1) + 0.5772156649) - (2 * (n - 1) / n)
      : 0;

    // Anomaly score: s(x, n) = 2^(-E(h(x))/c(n))
    // E(h(x)) là average path length
    // Score càng gần 1 → càng bất thường
    const score = Math.pow(2, -avgPathLength / c);
    
    return Math.min(Math.max(score, 0), 1); // Clamp between 0 and 1
  }

  /**
   * Dự đoán cho nhiều điểm
   * @param {Array} data - Mảng các feature vectors
   * @returns {Array} Mảng các anomaly scores
   */
  predictBatch(data) {
    return data.map(point => this.predict(point));
  }
}

module.exports = {
  IsolationForest,
  buildIsolationTree,
  pathLength
};









