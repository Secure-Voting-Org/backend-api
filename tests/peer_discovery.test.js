import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { P2PNetwork, MessageType } from '../utils/P2PNetwork.js';

import * as BlockchainModel from '../models/BlockchainModel.js';

// Mock WebSocket Class
class MockWebSocket {
    constructor(url) {
        this.url = url;
        this.listeners = {};
    }
    on(event, cb) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(cb);
        if (event === 'open') setTimeout(() => cb(), 10);
    }
    send(msg) {
        this.lastSent = msg;
    }
    simulateMessage(data) {
        if(this.listeners['message']) {
            this.listeners['message'].forEach(cb => cb(JSON.stringify(data)));
        }
    }
}

describe('Module 8: Node Peer Discovery', () => {

    beforeEach(() => {
        P2PNetwork.setBlockchainModel({
            getLastBlock: async () => ({ block_number: 5, block_hash: 'hash5' }),
            getAllBlocks: async () => ([{ block_number: 0 }, { block_number: 5 }]),
            saveBlock: async () => {}
        });
        P2PNetwork.setWebSocketClass(MockWebSocket);
        P2PNetwork.clearSockets();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should connect to seed peers automatically', async () => {
        const seedNodes = ['ws://localhost:6002', 'ws://localhost:6003'];
        
        P2PNetwork.connectToPeers(seedNodes);
        
        await new Promise(resolve => setTimeout(resolve, 20));

        const activeSockets = P2PNetwork.getSockets();
        expect(activeSockets.length).toBe(2);
        expect(activeSockets[0].url).toBe('ws://localhost:6002');
        
        const lastMsg = JSON.parse(activeSockets[0].lastSent);
        expect(lastMsg.type).toBe(MessageType.QUERY_LATEST);
    });

    it('should broadcast messages to all connected peers', async () => {
        P2PNetwork.connectToPeers(['ws://peer1', 'ws://peer2']);
        await new Promise(resolve => setTimeout(resolve, 20));

        P2PNetwork.broadcast({ type: 99, data: 'test' });

        const sockets = P2PNetwork.getSockets();
        sockets.forEach(ws => {
            const lastMsg = JSON.parse(ws.lastSent);
            expect(lastMsg.type).toBe(99);
            expect(lastMsg.data).toBe('test');
        });
    });

    it('should handle incoming QUERY_LATEST and respond with current last block', async () => {
        P2PNetwork.connectToPeers(['ws://peer1']);
        await new Promise(resolve => setTimeout(resolve, 50));
        
        const ws = P2PNetwork.getSockets()[0];
        ws.simulateMessage({ type: MessageType.QUERY_LATEST });
        
        await new Promise(resolve => setTimeout(resolve, 100));

        const replyMsg = JSON.parse(ws.lastSent);
        expect(replyMsg.type).toBe(MessageType.RESPONSE_BLOCKCHAIN);
        expect(replyMsg.data.length).toBe(1);
        expect(replyMsg.data[0].block_number).toBe(5); 
    });
});
