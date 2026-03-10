/**
 * P2P Network (Module 8 & 9 Placeholder)
 * Handles Peer Discovery, Connections, and basic Broadcasting.
 */
const WebSocket = require('ws');
const BlockchainModel = require('../models/BlockchainModel');

const peers = process.env.PEERS ? process.env.PEERS.split(',') : [];
const P2P_PORT = parseInt(process.env.P2P_PORT, 10) || 6001;

let sockets = [];

// Message Types
const MessageType = {
    QUERY_LATEST: 0,
    QUERY_ALL: 1,
    RESPONSE_BLOCKCHAIN: 2
};

let WSClass = WebSocket;
let DBModel = BlockchainModel;

class P2PNetwork {
    static setWebSocketClass(CustomWS) {
        WSClass = CustomWS;
    }
    
    static setBlockchainModel(CustomDB) {
        DBModel = CustomDB;
    }

    static initP2PServer() {
        if (process.env.NODE_ENV === 'test') return; // Don't bind ports in unit tests automatically

        const server = new WSClass.Server({ port: P2P_PORT });
        server.on('connection', ws => P2PNetwork.initConnection(ws));
        console.log('Listening for P2P connections on port: ' + P2P_PORT);
    }

    static initConnection(ws) {
        sockets.push(ws);
        P2PNetwork.initMessageHandler(ws);
        P2PNetwork.initErrorHandler(ws);
        // Ask for the latest block upon connecting
        P2PNetwork.write(ws, P2PNetwork.queryChainLengthMsg());
    }

    static initMessageHandler(ws) {
        ws.on('message', async (data) => {
            try {
                const message = JSON.parse(data);
                console.log('Received message:', JSON.stringify(message));
                switch (message.type) {
                    case MessageType.QUERY_LATEST:
                        const latest = await DBModel.getLastBlock();
                        if (latest) P2PNetwork.write(ws, P2PNetwork.responseLatestMsg(latest));
                        break;
                    case MessageType.QUERY_ALL:
                        const allBlocks = await DBModel.getAllBlocks();
                        if(allBlocks.length > 0) P2PNetwork.write(ws, P2PNetwork.responseChainMsg(allBlocks));
                        break;
                    case MessageType.RESPONSE_BLOCKCHAIN:
                        await P2PNetwork.handleBlockchainResponse(message.data);
                        break;
                }
            } catch (e) {
                console.error('P2P Message Parsing Error:', e);
            }
        });
    }

    static initErrorHandler(ws) {
        const closeConnection = (ws) => {
            console.log('Connection failed to peer: ' + ws.url);
            sockets.splice(sockets.indexOf(ws), 1);
        };
        ws.on('close', () => closeConnection(ws));
        ws.on('error', () => closeConnection(ws));
    }

    static connectToPeers(newPeers) {
        newPeers.forEach((peer) => {
            try {
                const ws = new WSClass(peer);
                ws.on('open', () => P2PNetwork.initConnection(ws));
                ws.on('error', () => {
                    console.log('Connection failed to seed peer:', peer);
                });
            } catch (err) {
                console.error("Failed to parse peer URL:", peer);
            }
        });
    }

    static async handleBlockchainResponse(receivedBlocks) {
        if (receivedBlocks.length === 0) return;

        const latestBlockReceived = receivedBlocks[receivedBlocks.length - 1];
        const latestBlockHeld = await DBModel.getLastBlock();

        // If we have no blocks at all (not even genesis), we should accept this chain
        if (!latestBlockHeld) {
             console.log('Blockchain is empty, requesting full chain...');
             P2PNetwork.broadcast(P2PNetwork.queryAllMsg());
             return;
        }

        if (latestBlockReceived.block_number > latestBlockHeld.block_number) {
            console.log('Blockchain possibly behind. We got: ' + latestBlockHeld.block_number + ' Peer got: ' + latestBlockReceived.block_number);
            
            if (latestBlockHeld.block_hash === latestBlockReceived.previous_hash) {
                console.log('We can append the received block to our chain');
                await DBModel.saveBlock(latestBlockReceived);
                P2PNetwork.broadcast(P2PNetwork.responseLatestMsg(await DBModel.getLastBlock()));
            } else if (receivedBlocks.length === 1) {
                console.log('We have to query the chain from our peer');
                P2PNetwork.broadcast(P2PNetwork.queryAllMsg());
            } else {
                console.log('Received blockchain is longer. Triggering Fork Resolution (Longest Chain Rule).');
                const success = await DBModel.replaceChain(receivedBlocks);
                if (success) {
                    P2PNetwork.broadcast(P2PNetwork.responseLatestMsg(await DBModel.getLastBlock()));
                }
            }
        } else {
            console.log('Received blockchain is not longer than current blockchain. Do nothing');
        }
    }

    static queryChainLengthMsg() { return { 'type': MessageType.QUERY_LATEST }; }
    static queryAllMsg() { return { 'type': MessageType.QUERY_ALL }; }
    static responseChainMsg(blockchain) { return { 'type': MessageType.RESPONSE_BLOCKCHAIN, 'data': blockchain }; }
    static responseLatestMsg(block) { return { 'type': MessageType.RESPONSE_BLOCKCHAIN, 'data': [block] }; }

    static write(ws, message) { ws.send(JSON.stringify(message)); }
    static broadcast(message) { sockets.forEach(socket => P2PNetwork.write(socket, message)); }

    // Exposed for testing
    static getSockets() { return sockets; }
    static clearSockets() { sockets = []; }
}

module.exports = { P2PNetwork, MessageType };
