
import { StorageService } from '../app/storage';

export interface FriendEdge {
    peerId: string;
    peerName: string;
    status: 'pending_out' | 'pending_in' | 'accepted';
    createdAt?: number;
    isBot?: boolean; // Added for bot identification
}

// MP: Repository handling friend relationship state
export const FriendsRepository = {
    getFriendEdges(): FriendEdge[] {
        const profile = StorageService.getProfile();
        const edges: FriendEdge[] = [];

        // 1) DragonBot (Always present)
        edges.push({
            peerId: 'dragon-bot',
            peerName: 'DragonBot 🤖',
            status: 'accepted',
            isBot: true
        });

        // Accepted
        profile.friends.forEach(f => {
            edges.push({ peerId: f.id, peerName: f.username, status: 'accepted' });
        });

        // Outgoing
        profile.friendRequests.outgoing.forEach(r => {
            edges.push({ peerId: r.id, peerName: r.username, status: 'pending_out' });
        });

        // Incoming
        profile.friendRequests.incoming.forEach(r => {
            edges.push({ peerId: r.id, peerName: r.username, status: 'pending_in' });
        });

        return edges;
    },

    acceptRequest(peerId: string, peerName: string) {
        const profile = StorageService.getProfile();
        
        // Remove from incoming
        profile.friendRequests.incoming = profile.friendRequests.incoming.filter(r => r.id !== peerId);
        
        // Add to friends if not exists
        if (!profile.friends.some(f => f.id === peerId)) {
            profile.friends.push({ id: peerId, username: peerName });
        }
        
        StorageService.saveProfile(profile);
    },

    declineRequest(peerId: string) {
        const profile = StorageService.getProfile();
        profile.friendRequests.incoming = profile.friendRequests.incoming.filter(r => r.id !== peerId);
        StorageService.saveProfile(profile);
    },
    
    // For manual testing/debug
    mockReceiveRequest(peerId: string, peerName: string) {
         const profile = StorageService.getProfile();
         if (!profile.friendRequests.incoming.some(r => r.id === peerId) && !profile.friends.some(f => f.id === peerId)) {
             profile.friendRequests.incoming.push({ id: peerId, username: peerName });
             StorageService.saveProfile(profile);
         }
    }
};
