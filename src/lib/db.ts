import mysql from 'mysql2/promise';

const pool = mysql.createPool(process.env.DATABASE_URL || 'mysql://user:password@localhost:3306/bookmatch');

export default pool;
