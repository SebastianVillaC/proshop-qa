// Base de datos MongoDB en memoria para pruebas de integración aisladas.
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../../app/backend/models/userModel.js';
import Product from '../../app/backend/models/productModel.js';
import Order from '../../app/backend/models/orderModel.js';
import users from '../../app/backend/data/users.js';
import products from '../../app/backend/data/products.js';

let mongod;

export async function connect() {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
}

export async function disconnect() {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
}

/** Restaura los datos semilla de ProShop (3 usuarios, 6 productos, 0 órdenes). */
export async function seed() {
  await Order.deleteMany();
  await Product.deleteMany();
  await User.deleteMany();
  const createdUsers = await User.insertMany(users);
  const admin = createdUsers[0]._id;
  const createdProducts = await Product.insertMany(
    products.map((p) => ({ ...p, user: admin }))
  );
  return { users: createdUsers, products: createdProducts };
}
