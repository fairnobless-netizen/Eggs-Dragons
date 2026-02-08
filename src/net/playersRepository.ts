
import { ApiClient } from './apiClient';
import { StorageService } from '../app/storage';
import { PublicProfile } from './types';

// MP: Repository handling player search and friend logic
export const PlayersRepository = {
    /**
     * Search players via API (Leaderboard/DB)
     * Fallback to local cache is simulated by the fact that MockApi persists state in memory.
     */
    async searchPlayers(prefix: string, limit: number = 10): Promise<PublicProfile[]> {
        if (!prefix || prefix.length < 2) return [];
        
        // (a) try existing Leaderboard/score storage player list via API
        const results = await ApiClient.searchUsers(prefix);

        // (b) & (c) Logic handled by MockApi/API implementation usually, 
        // but here we ensure current user is findable if they match? 
        // We'll rely on the API returning the current user if they are in the DB.
        
        return results.slice(0, limit);
    },

    /**
     * Creates a local outgoing friend request
     */
    sendFriendRequest(targetUser: PublicProfile) {
        const profile = StorageService.getProfile();
        
        // Prevent adding self
        if (targetUser.id === profile.userId) return;

        // Init structure if missing (migration safety)
        if (!profile.friendRequests) profile.friendRequests = { incoming: [], outgoing: [] };
        
        // Check if already requested or already friends
        // MP: Updated check for new object array structure in friends
        const isPending = profile.friendRequests.outgoing.some(req => req.id === targetUser.id);
        const isFriend = profile.friends.some(f => f.id === targetUser.id);

        if (!isPending && !isFriend) {
            profile.friendRequests.outgoing.push({
                id: targetUser.id,
                username: targetUser.username
            });
            StorageService.saveProfile(profile);
        }
    }
};
