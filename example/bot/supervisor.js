const dotenv = require('dotenv');
const mysql = require('mysql');
const { createClient } = require('redis');
const { RedisCommandQueue, Supervisor, RedisChannelDistributor } = require('../../src');

dotenv.config();

const db = mysql.createPool({
	host: '127.0.0.1',
	port: 3306,
	user: process.env.DB_USERNAME || 'root',
	password: process.env.DB_PASSWORD || '',
	database: process.env.DB_DATABASE,
	multipleStatements: true,
	charset: 'utf8mb4_general_ci',
});

const redisClient = createClient({
	url: 'redis://' + process.env.REDIS_URL,
});

redisClient
	.connect()
	.then(() => {
		const manager = new Supervisor({
			database: db,
			channelDistributor: new RedisChannelDistributor(db, new RedisCommandQueue(redisClient)),
		});

		manager.on('process.create', (id) => {
			console.log('[supervisor] new process created, id:', id);
		});

		manager.on('tmi.join_error', (...args) => {
			console.log('[supervisor] can\'t join channel:', ...args);
		});

		manager.on('ping', () => {
			// console.log('[manager] supervisor running, last ping:', Date.now());
		});

		manager.spawn();
	})
	.catch((error) => {
		console.error('Can\'t connect to redis.', error)
	});