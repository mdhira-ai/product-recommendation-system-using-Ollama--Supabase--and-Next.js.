import os
import requests
import json
from supabase import create_client, Client
from dotenv import load_dotenv
load_dotenv()


# Initialize Supabase client
url: str = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
key: str = os.getenv('NEXT_PUBLIC_SUPABASE_KEY')
supabase: Client = create_client(url, key)


def generate_embedding(text):
    response = requests.post('http://localhost:11434/api/embeddings', json={
        'model': 'nomic-embed-text',
        'prompt': text,
    })
    return response.json()['embedding']


def update_product_embeddings():
    # Fetch products without embeddings
    response = supabase.table('recproducts').select(
        'id, name, description').execute()
    products = response.data

    for product in products:
        # Generate embedding from name and description
        text = f"{product['name']} {product['description']}"
        embedding = generate_embedding(text)

        # Update product with embedding
        supabase.table('recproducts').update(
            {'embedding': embedding}).eq('id', product['id']).execute()

    print("Embeddings updated successfully")


if __name__ == "__main__":
    update_product_embeddings()
