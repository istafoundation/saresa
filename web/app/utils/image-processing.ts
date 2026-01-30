
// Helper to process image URLs (used by CSV and Manual entry)
export const processImageUrl = async (url: string, context: string, imagekit: any): Promise<string> => {
  if (!url) throw new Error(`${context}: Image URL missing`);
  
  if (url.includes("imagekit.io")) {
    return url; 
  }

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch image: ${url}`);
    const blob = await response.blob();
    
    const file = new File([blob], "match-upload.jpg", { type: blob.type });
    
    const authRes = await fetch("/api/imagekit");
    if (!authRes.ok) throw new Error("Failed to get upload auth");
    const authParams = await authRes.json();

    const result = await imagekit.upload({
      file: file,
      fileName: `match_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      useUniqueFileName: true,
      tags: ["match-import"],
      folder: "/match-questions",
      token: authParams.token,
      signature: authParams.signature,
      expire: authParams.expire
    });
    
    return result.url;
  } catch (err) {
    console.error("Image processing error:", err);
    throw new Error(`${context}: Failed to process image ${url}. Error: ${(err as Error).message}`);
  }
};
