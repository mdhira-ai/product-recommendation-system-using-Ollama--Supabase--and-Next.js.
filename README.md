## Overview

The application includes an API route for product recommendations using Supabase, Ollama (nomic-embed-text), Langchain, and Next.js, components to list products and recommendations, a main page to integrate these components, and a script to generate and update product embeddings.

## Prerequisites

- Node.js
- Next.js
- Supabase account
- Python
- Necessary API keys for Supabase and Ollama

## Getting Started

### 1. Setup API Route

Create an API route at `api/recommend` to fetch and recommend products based on their embeddings.

```javascript
// File: api/recommend.ts
import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  if (req.method === "POST") {
    try {
      const { productId } = await req.json();
      console.log(productId);

      // Fetch the selected product's embedding
      const { data: selectedProduct, error: selectError } = await supabase
        .from("recproducts")
        .select("embedding")
        .eq("id", productId)
        .single();

      if (selectError) {
        return NextResponse.json({
          error: selectError.message,
        });
      }

      // Find similar products based on embedding similarity
      const { data: recommendations, error: recommendError } =
        await supabase.rpc("rec_match_products", {
          query_embedding: selectedProduct.embedding,
          match_threshold: 0.78, // Adjust this value as needed
          match_count: 5, // Number of recommendations to return
        });

      if (recommendError) {
        return NextResponse.json({
          error: recommendError.message,
        });
      }

      return NextResponse.json({ recommendations });
    } catch (error) {
      return NextResponse.json({ error: "An unexpected error occurred" });
    }
  } else {
    return NextResponse.json({ error: "Method not allowed" });
  }
}
```

### 2. Create Product and Recommendation Components

Create components to list products and show recommendations.

```javascript
// File: components/Mycom.tsx
'use client'
import { supabase } from '@/lib/supabase';
import React, { useState, useEffect } from 'react';

const ProductList = ({ onSelectProduct }: any) => {
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
      {products.map((product: any) => (
        <div key={product.id} className="border p-4 rounded cursor-pointer" onClick={() => onSelectProduct(product.id)}>
          <h3 className="font-bold">{product.name}</h3>
          <p>{product.description}</p>
          <p className="text-right font-bold">${product.price}</p>
        </div>
      ))}
    </div>
  );
};

const RecommendationList = ({ productId }: any) => {
  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    if (productId) fetchRecommendations(productId);
  }, [productId]);

  const fetchRecommendations = async (id: any) => {
    const response = await fetch('/api/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: id }),
    });
    const data = await response.json();
    console.log(data);
    setRecommendations(data.recommendations);
  };

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold mb-4">Recommended Products</h2>
      <div className="grid grid-cols-3 gap-4">
        {recommendations.map((product: any) => (
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
```

### 3. Integrate Components in Page

Integrate the components in a main page.

```javascript
// File: pages/page.tsx
'use client'
import { ProductList, RecommendationList } from "@/components/Mycom";
import { useState } from "react";

const Page = () => {
  const [selectId, setSelectId] = useState<any>();

  return (
    <div>
      <ProductList
        onSelectProduct={(productId: any) => {
          setSelectId(productId);
        }}
      />

      <RecommendationList productId={selectId} />
    </div>
  );
}

export default Page;
```

### 4. Generate and Update Embeddings Script

Create a script to generate and update product embeddings.

```python
# File: scripts/update_embeddings.py
import requests
import json
from supabase import create_client, Client

# Initialize Supabase client
url: str = "your_supabase_url"
key: str = "your_supabase_key"
supabase: Client = create_client(url, key)

def generate_embedding(text):
    response = requests.post('http://localhost:11434/api/embeddings', json={
        'model': 'nomic-embed-text',
        'prompt': text,
    })
    return response.json()['embedding']

def update_product_embeddings():
    # Fetch products without embeddings
    response = supabase.table('recproducts').select('id, name, description').execute()
    products = response.data

    for product in products:
        # Generate embedding from name and description
        text = f"{product['name']} {product['description']}"
        embedding = generate_embedding(text)

        # Update product with embedding
        supabase.table('recproducts').update({'embedding': embedding}).eq('id', product['id']).execute()

    print("Embeddings updated successfully")

if __name__ == "__main__":
    update_product_embeddings()
```

### 5. Configure Supabase

Add the following SQL commands to your Supabase database.

```sql
-- Enable the vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create the products table
CREATE TABLE recproducts (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    price DECIMAL(10, 2) NOT NULL,
    embedding vector(384)  -- Adjust the vector dimension based on your Ollama model output
);

-- Adjust the embedding column data type
ALTER TABLE recproducts
    ALTER COLUMN embedding SET DATA TYPE vector(768);

-- Create index on the embedding column
CREATE INDEX ON recproducts USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Function to match products based on embedding similarity
CREATE OR REPLACE FUNCTION rec_match_products(
    query_embedding vector,
    match_threshold float,
    match_count int
)
RETURNS TABLE (
    id bigint,
    name text,
    description text,
    category text,
    price decimal,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.name,
        p.description,
        p.category,
        p.price,
        1 - (p.embedding <=> query_embedding) AS similarity
    FROM recproducts p
    WHERE 1 - (p.embedding <=> query_embedding) > match_threshold
    ORDER BY similarity DESC
    LIMIT match_count;
END;
$$;

-- Example: Insert a product
INSERT INTO recproducts (name, description, category, price)
VALUES (
    'Sample Product',
    'This is a sample product description',
    'Electronics',
    99.99
);
```

## Running the Application

1. **Start the Next.js application:**
   ```sh
   npm install
   npm run dev
   ```

2. **Run the embeddings update script:**
   ```sh
   python scripts/update_embeddings.py
   ```

3. **Access the application:**
   Open your browser and navigate to `http://localhost:3000`.

## License

This project is licensed under the MIT License. See the LICENSE file for details.

## Contributing

Feel free to open issues or submit pull requests. Contributions are welcome!