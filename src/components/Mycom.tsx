'use client'
import { supabase } from '@/lib/supabase';
import React, { useState, useEffect } from 'react';

const ProductList = ({ onSelectProduct}:any) => {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('recproducts')
      .select('id, name, description, price');
    if (error) console.error('Error fetching products:', error);
    else setProducts(data);
  };

  return (
    <div className="grid grid-cols-3 gap-4 h-[400px] overflow-scroll">
      {products.map((product:any) => (
        <div key={product.id} className="border p-4 rounded cursor-pointer" onClick={() => onSelectProduct(product.id)}>
          <h3 className="font-bold">{product.name}</h3>
          <p>{product.description}</p>
          <p className="text-right font-bold">${product.price}</p>
        </div>
      ))}
    </div>
  );
};

const RecommendationList = ({ productId }:any) => {
  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    if (productId) fetchRecommendations(productId);
  }, [productId]);

  const fetchRecommendations = async (id:any) => {
    const response = await fetch('/api/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: id }),
    });
    const data = await response.json()
    console.log(data);
    setRecommendations(data.recommendations);
  };

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold mb-4">Recommended Products</h2>
      <div className="grid grid-cols-3 gap-4">
        {recommendations.map((product:any) => (
          <div key={product.id} className="border p-4 rounded">
            <h3 className="font-bold">{product.name}</h3>
            <p>{product.description}</p>
            <p className="text-right font-bold">${product.price}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export { ProductList, RecommendationList };