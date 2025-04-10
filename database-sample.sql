-- Sample database schema for MCP Server demonstration
-- Run this SQL file to create a test database with sample tables and data

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS mcp_database;
USE mcp_database;

-- Create Users table
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    age INT,
    registration_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN DEFAULT TRUE
);

-- Create Products table
CREATE TABLE IF NOT EXISTS products (
    product_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    category VARCHAR(50),
    stock_quantity INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create Orders table
CREATE TABLE IF NOT EXISTS orders (
    order_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    total_amount DECIMAL(10, 2) NOT NULL,
    status ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Create Order_Items table (junction table for orders and products)
CREATE TABLE IF NOT EXISTS order_items (
    item_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(order_id),
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- Insert sample users
INSERT INTO users (username, email, full_name, age) VALUES
('john_doe', 'john@example.com', 'John Doe', 28),
('jane_smith', 'jane@example.com', 'Jane Smith', 34),
('bob_johnson', 'bob@example.com', 'Bob Johnson', 45),
('alice_brown', 'alice@example.com', 'Alice Brown', 22),
('charlie_davis', 'charlie@example.com', 'Charlie Davis', 31);

-- Insert sample products
INSERT INTO products (name, description, price, category, stock_quantity) VALUES
('Laptop', 'High-performance laptop with 16GB RAM', 1299.99, 'Electronics', 25),
('Smartphone', 'Latest model with advanced camera', 899.99, 'Electronics', 50),
('Coffee Maker', 'Programmable coffee maker with timer', 79.99, 'Kitchen', 15),
('Desk Chair', 'Ergonomic office chair with lumbar support', 199.99, 'Furniture', 10),
('Headphones', 'Noise-cancelling wireless headphones', 149.99, 'Electronics', 30),
('Yoga Mat', 'Non-slip exercise mat', 25.99, 'Fitness', 40),
('Blender', 'High-speed blender for smoothies', 89.99, 'Kitchen', 20),
('Tablet', '10-inch tablet with HD display', 349.99, 'Electronics', 15);

-- Insert sample orders
INSERT INTO orders (user_id, total_amount, status) VALUES
(1, 1299.99, 'delivered'),
(2, 239.98, 'shipped'),
(3, 899.99, 'processing'),
(4, 115.98, 'pending'),
(1, 549.97, 'delivered');

-- Insert sample order items
INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES
(1, 1, 1, 1299.99),
(2, 3, 1, 79.99),
(2, 6, 2, 25.99),
(3, 2, 1, 899.99),
(4, 6, 1, 25.99),
(4, 3, 1, 79.99),
(5, 5, 1, 149.99),
(5, 7, 1, 89.99),
(5, 6, 1, 25.99);

-- Example queries to try with the natural language interface:
-- 1. "Show me all users over 30"
-- 2. "List products in the Electronics category"
-- 3. "What's the total value of all pending orders?"
-- 4. "Add a new product named Gaming Mouse with price $59.99 in Electronics category with 45 in stock"
-- 5. "Update the price of the Laptop to $1199.99"
-- 6. "Show me all orders placed by John Doe"