const amqp = require('amqplib');

let connection = null;
let channel = null;
const EXCHANGE_NAME = 'truesource_events';
const QUEUE_NAME = 'truesource_monitoring';

/**
 * Initialize RabbitMQ connection
 */
async function initRabbitMQ() {
  try {
    const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
    console.log(`Connecting to RabbitMQ at ${rabbitmqUrl}...`);
    
    connection = await amqp.connect(rabbitmqUrl);
    console.log('✅ RabbitMQ connected');
    
    channel = await connection.createChannel();
    console.log('✅ RabbitMQ channel created');
    
    // Declare exchange
    await channel.assertExchange(EXCHANGE_NAME, 'topic', {
      durable: true
    });
    console.log(`✅ Exchange "${EXCHANGE_NAME}" declared`);
    
    // Declare queue
    await channel.assertQueue(QUEUE_NAME, {
      durable: true
    });
    console.log(`✅ Queue "${QUEUE_NAME}" declared`);
    
    // Bind queue to exchange
    await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, 'product.*');
    await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, 'user.*');
    await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, 'ai.*');
    console.log('✅ Queue bound to exchange');
    
    return { connection, channel };
  } catch (error) {
    console.error('❌ RabbitMQ connection error:', error.message);
    console.warn('⚠️  RabbitMQ monitoring will be disabled');
    return null;
  }
}

/**
 * Publish event to RabbitMQ
 */
async function publishEvent(eventType, data) {
  if (!channel) {
    // Silently fail if RabbitMQ is not available
    return;
  }
  
  try {
    const message = JSON.stringify({
      eventType,
      data,
      timestamp: new Date().toISOString()
    });
    
    await channel.publish(EXCHANGE_NAME, eventType, Buffer.from(message), {
      persistent: true
    });
    
    console.log(`📤 RabbitMQ: Published event "${eventType}"`);
  } catch (error) {
    console.error(`❌ Error publishing to RabbitMQ:`, error.message);
  }
}

/**
 * Consume messages from queue (for monitoring)
 */
async function consumeEvents(callback) {
  if (!channel) {
    return;
  }
  
  try {
    await channel.consume(QUEUE_NAME, (msg) => {
      if (msg) {
        const content = JSON.parse(msg.content.toString());
        callback(content);
        channel.ack(msg);
      }
    });
    
    console.log('✅ RabbitMQ consumer started');
  } catch (error) {
    console.error('❌ Error consuming from RabbitMQ:', error.message);
  }
}

/**
 * Close RabbitMQ connection
 */
async function closeRabbitMQ() {
  try {
    if (channel) {
      await channel.close();
    }
    if (connection) {
      await connection.close();
    }
    console.log('✅ RabbitMQ connection closed');
  } catch (error) {
    console.error('❌ Error closing RabbitMQ:', error.message);
  }
}

module.exports = {
  initRabbitMQ,
  publishEvent,
  consumeEvents,
  closeRabbitMQ
};


