import { Request, Response } from "express";
import getInfo from "../lib/getInfo";
import getStream from "./getStream";

interface PlaylistItem {
    title: string;
    file?: string;
    id: string;
    folder?: PlaylistItem[];
    episode?: string;
}

interface MediaInfoResponse {
    success: boolean;
    data?: {
        playlist: PlaylistItem[];
        key: string;
    };
    message?: string;
}

export default async function getM3u8(req: Request, res: Response) {
    const { id, season, episode, lang = "English" } = req.query;
    
    if (!id) {
        return res.json({
            success: false,
            message: "Please provide a valid IMDB id",
        });
    }

    try {
        // First get the media info
        const mediaInfoData = await getInfo(id as string) as MediaInfoResponse;
        
        if (!mediaInfoData.success || !mediaInfoData.data) {
            return res.json({
                success: false,
                message: "Failed to fetch media info",
            });
        }

        const playlist = mediaInfoData.data.playlist;

        // If season and episode are provided, handle TV series
        if (season && episode) {
            // Find the season
            const seasonItem = playlist.find((item: PlaylistItem) => 
                item.title === `Season ${season}` || item.id === season
            );

            if (!seasonItem || !seasonItem.folder) {
                return res.json({
                    success: false,
                    message: `Season ${season} not found. Available seasons: ${playlist.map((item: PlaylistItem) => item.title).join(", ")}`,
                });
            }

            // Find the episode
            const episodeItem = seasonItem.folder.find((item: PlaylistItem) =>
                item.episode === episode || item.id === `${season}-${episode}`
            );

            if (!episodeItem || !episodeItem.folder) {
                return res.json({
                    success: false,
                    message: `Episode ${episode} not found in Season ${season}`,
                });
            }

            // Find the language stream
            const languageStream = episodeItem.folder?.find((item: PlaylistItem) =>
                item.title?.toLowerCase() === (lang as string).toLowerCase()
            );

            if (!languageStream || !languageStream.file || !episodeItem.folder) {
                const availableLanguages = episodeItem.folder
                    ? episodeItem.folder
                        .filter((item: PlaylistItem) => item.title)
                        .map((item: PlaylistItem) => item.title)
                    : [];
                return res.json({
                    success: false,
                    message: `Stream not available in ${lang}. Available languages: ${availableLanguages.join(", ")}`,
                });
            }

            // Create a new request object for getStream
            const streamReq = {
                body: {
                    file: languageStream.file,
                    key: mediaInfoData.data.key
                }
            } as Request;

            // Create a new response object to capture getStream response
            const streamRes = {
                json: (data: any) => {
                    if (data.success && data.data?.link) {
                        return res.json({
                            success: true,
                            data: {
                                link: data.data.link,
                                season: seasonItem.title,
                                episode: episodeItem.title,
                                language: languageStream.title,
                                availableLanguages: episodeItem.folder
                                    ? episodeItem.folder
                                        .filter((item: PlaylistItem) => item.title)
                                        .map((item: PlaylistItem) => item.title)
                                    : []
                            }
                        });
                    } else {
                        return res.json({
                            success: false,
                            message: "Failed to fetch stream URL",
                            error: data.message || "Unknown error"
                        });
                    }
                }
            } as Response;

            // Use the existing getStream controller
            await getStream(streamReq, streamRes);
        } else {
            // Handle movies (original logic)
            const languageStream = playlist.find(item => 
                item.title?.toLowerCase() === (lang as string).toLowerCase()
            );

            if (!languageStream || !languageStream.file) {
                return res.json({
                    success: false,
                    message: `Stream not available in ${lang}. Available languages: ${playlist.map(item => item.title).join(", ")}`,
                });
            }

            // Create a new request object for getStream
            const streamReq = {
                body: {
                    file: languageStream.file,
                    key: mediaInfoData.data.key
                }
            } as Request;

            // Create a new response object to capture getStream response
            const streamRes = {
                json: (data: any) => {
                    if (data.success && data.data?.link) {
                        return res.json({
                            success: true,
                            data: {
                                link: data.data.link,
                                language: languageStream.title,
                                availableLanguages: playlist.map(item => item.title)
                            }
                        });
                    } else {
                        return res.json({
                            success: false,
                            message: "Failed to fetch stream URL",
                            error: data.message || "Unknown error"
                        });
                    }
                }
            } as Response;

            // Use the existing getStream controller
            await getStream(streamReq, streamRes);
        }

    } catch (err) {
        console.error("Error in getM3u8:", err);
        return res.json({
            success: false,
            message: "Internal server error",
            error: err instanceof Error ? err.message : String(err)
        });
    }
} 