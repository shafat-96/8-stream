import axios from "axios";
import * as cheerio from "cheerio";

export async function getPlayerUrl() {
    try {
        // First get the movie page HTML
        const baseUrl = process.env.BASE_URL!;
        const response = await axios.get(baseUrl);
        const html = response.data;
        
        // Extract the player URL using regex
        // Looking for pattern: const AwsIndStreamDomain = 'https://vista335lopq.com/';
        const playerUrlMatch = html.match(/const\s+AwsIndStreamDomain\s*=\s*['"]([^'"]+)['"]/i);
        
        if (!playerUrlMatch || !playerUrlMatch[1]) {
            // If direct match fails, try to find it in script content
            const $ = cheerio.load(html);
            let playerUrl = '';
            
            $('script').each((_, script) => {
                const content = $(script).html() || '';
                const match = content.match(/AwsIndStreamDomain\s*=\s*['"]([^'"]+)['"]/i);
                if (match && match[1]) {
                    playerUrl = match[1];
                    return false; // break the loop
                }
            });
            
            if (!playerUrl) {
                throw new Error("Could not find player URL in the response");
            }
            
            return playerUrl;
        }
        
        return playerUrlMatch[1].replace(/\/$/, ''); // Remove trailing slash if exists
        
    } catch (error) {
        console.error("Error getting player URL:", error);
        // Return a default URL if configured
        if (process.env.DEFAULT_PLAYER_URL) {
            return process.env.DEFAULT_PLAYER_URL;
        }
        throw error;
    }
}
