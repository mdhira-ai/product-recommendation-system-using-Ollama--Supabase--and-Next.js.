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
