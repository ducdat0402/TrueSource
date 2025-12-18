/**
 * OpenAI Service - Tích hợp OpenAI API cho phân tích thông minh
 * 
 * Sử dụng GPT để phân tích và giải thích anomalies một cách tự nhiên
 */

const OpenAI = require('openai');

let openaiClient = null;

/**
 * Initialize OpenAI client
 */
function initializeOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.log('⚠️ OPENAI_API_KEY không được cấu hình. OpenAI features sẽ bị tắt.');
    return false;
  }

  try {
    openaiClient = new OpenAI({
      apiKey: apiKey
    });
    console.log('✅ OpenAI client initialized');
    return true;
  } catch (error) {
    console.error('Error initializing OpenAI:', error);
    return false;
  }
}

/**
 * Phân tích sản phẩm với OpenAI GPT
 * @param {Object} product - Product object
 * @param {Object} mlResult - Kết quả từ ML model
 * @returns {Object} AI analysis từ OpenAI
 */
async function analyzeWithOpenAI(product, mlResult) {
  if (!openaiClient) {
    if (!initializeOpenAI()) {
      return null;
    }
  }

  try {
    const events = product.events || [];
    
    // Chuẩn bị context cho GPT
    const eventsSummary = events.map((e, idx) => {
      const date = new Date(e.timestamp * 1000).toLocaleString('vi-VN');
      return `${idx + 1}. ${e.eventType || 'Unknown'} - ${e.location || 'N/A'} - ${date}`;
    }).join('\n');

    const prompt = `Bạn là chuyên gia phân tích chuỗi cung ứng. Hãy phân tích sản phẩm sau và đưa ra nhận định về tính hợp lệ của chuỗi cung ứng.

Thông tin sản phẩm:
- ID: ${product.id}
- Xuất xứ: ${product.origin || 'N/A'}
- Trạng thái hiện tại: ${product.currentStatus || 'N/A'}

Lịch sử events:
${eventsSummary}

Kết quả phân tích ML:
- Anomaly Score: ${mlResult?.score || 'N/A'}/100
- Method: ${mlResult?.method || 'N/A'}

Hãy phân tích và trả lời bằng tiếng Việt với format JSON:
{
  "summary": "Tóm tắt ngắn gọn về tính hợp lệ của chuỗi cung ứng",
  "riskLevel": "low|medium|high",
  "keyFindings": ["finding1", "finding2", ...],
  "recommendations": ["recommendation1", "recommendation2", ...],
  "explanation": "Giải thích chi tiết về các anomalies phát hiện được"
}`;

    const completion = await openaiClient.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Bạn là chuyên gia phân tích chuỗi cung ứng và phát hiện gian lận. Hãy phân tích kỹ lưỡng và đưa ra nhận định chính xác.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3, // Thấp hơn để có kết quả nhất quán hơn
      max_tokens: 500
    });

    const responseText = completion.choices[0].message.content;
    
    // Parse JSON từ response
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const aiAnalysis = JSON.parse(jsonMatch[0]);
        return {
          ...aiAnalysis,
          rawResponse: responseText,
          model: 'gpt-3.5-turbo'
        };
      }
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
    }

    // Fallback: return raw text
    return {
      summary: responseText,
      rawResponse: responseText,
      model: 'gpt-3.5-turbo'
    };
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    return null;
  }
}

/**
 * Generate natural language explanation cho anomalies
 */
async function explainAnomalies(anomalies, product) {
  if (!openaiClient) {
    if (!initializeOpenAI()) {
      return null;
    }
  }

  try {
    const anomaliesText = anomalies.map((a, idx) => 
      `${idx + 1}. ${a.type}: ${a.message} (Severity: ${a.severity})`
    ).join('\n');

    const prompt = `Giải thích các anomalies sau một cách dễ hiểu cho người dùng không chuyên về kỹ thuật. Sử dụng tiếng Việt.

Anomalies:
${anomaliesText}

Hãy giải thích:
1. Tại sao các anomalies này được phát hiện?
2. Ý nghĩa của chúng là gì?
3. Có thể là dấu hiệu của gian lận không?

Trả lời ngắn gọn, dễ hiểu.`;

    const completion = await openaiClient.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.5,
      max_tokens: 300
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error('Error explaining anomalies:', error);
    return null;
  }
}

module.exports = {
  initializeOpenAI,
  analyzeWithOpenAI,
  explainAnomalies,
  isAvailable: () => {
    if (!openaiClient) {
      return initializeOpenAI();
    }
    return true;
  }
};









