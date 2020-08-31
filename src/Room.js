const config = require('./config')
const { Producer } = require('mediasoup/lib/types')
module.exports = class Room {
    constructor(room_id, worker, io) {
        this.id = room_id
        const mediaCodecs = config.mediasoup.router.mediaCodecs
        worker.createRouter({
            mediaCodecs
        }).then(function (router) {
            this.router = router
        }.bind(this))

        this.peers = new Map()
        this.io = io
    }

    addPeer(peer) {
        this.peers.set(peer.id, peer)
    }

    getProducerListForPeer(socket_id,data) {
        let producerList = []
         
        let producer_name, producer_socket_id
        if(data.type==="Instructor"){

            console.log("++++++++++++++++++++++++++++++++++in1");
                this.peers.forEach(peer => {
                    producer_name = peer.name
                    producer_socket_id = peer.id
                    peer.producers.forEach(producer => {
                        producerList.push({
                            producer_id: producer.id,
                            producer_socket_id: producer_socket_id,
                            producer_name: producer_name
                        })
                    })
        
            });
        }
            else
        {
            console.log('++++++++++++++++++++++++++++++in2');
                this.peers.forEach(peer => {
                    if(peer.type==="Instructor"){
                        producer_name = peer.name
                        producer_socket_id = peer.id
                        peer.producers.forEach(producer => {
                            producerList.push({ 
                                producer_id: producer.id,
                                producer_socket_id: producer_socket_id,
                                producer_name: producer_name 
                        })
                    })}
            })
        }
        return producerList
    }

    getRtpCapabilities() {
        return this.router.rtpCapabilities
    }

    async createWebRtcTransport(socket_id) {
        const {
            maxIncomingBitrate,
            initialAvailableOutgoingBitrate
        } = config.mediasoup.webRtcTransport;

        const transport = await this.router.createWebRtcTransport({
            listenIps: config.mediasoup.webRtcTransport.listenIps,
            enableUdp: true,
            enableTcp: true,
            preferUdp: true,
            initialAvailableOutgoingBitrate,
        });
        if (maxIncomingBitrate) {
            try {
                await transport.setMaxIncomingBitrate(maxIncomingBitrate);
            } catch (error) {}
        }

        transport.on('dtlsstatechange', function(dtlsState) {

            if (dtlsState === 'closed') {
                console.log('---transport close--- ' + this.peers.get(socket_id).name + ' closed')
                transport.close()
            }
        }.bind(this))

        transport.on('close', () => {
            console.log('---transport close--- ' + this.peers.get(socket_id).name + ' closed')
        })
        console.log('---adding transport---', transport.id)
        this.peers.get(socket_id).addTransport(transport)
        return {
            params: {
                id: transport.id,
                iceParameters: transport.iceParameters,
                iceCandidates: transport.iceCandidates,
                dtlsParameters: transport.dtlsParameters
            },
        };
    }

    async connectPeerTransport(socket_id, transport_id, dtlsParameters) {
        if (!this.peers.has(socket_id)) return
        await this.peers.get(socket_id).connectTransport(transport_id, dtlsParameters)

    }

    async produce(socket_id, producerTransportId, rtpParameters, kind) {
        // handle undefined errors
        return new Promise(async function (resolve, reject) {
            let producer = await this.peers.get(socket_id).createProducer(producerTransportId, rtpParameters, kind)
            resolve(producer.id)
            this.broadCast(socket_id, 'newProducers', [{
                producer_id: producer.id,
                producer_socket_id: socket_id,
                producer_name: this.peers.get(socket_id).name
            }])
        }.bind(this))
    }

    async consume(socket_id, consumer_transport_id, producer_id,  rtpCapabilities) {
        // handle nulls
        if (!this.router.canConsume({
                producerId: producer_id,
                rtpCapabilities,
            })) {
            console.error('can not consume');
            return;
        }
        let {consumer, params} = await this.peers.get(socket_id).createConsumer(consumer_transport_id, producer_id, rtpCapabilities)
        let producer_socket_id
            this.peers.forEach((peer) => {
                if(peer.producers.has(producer_id)){
                    producer_socket_id = peer.id
                }
            })
        consumer.on('producerclose', function(){
            console.log(`---consumer closed--- due to producerclose event  name:${this.peers.get(socket_id).name} consumer_id: ${consumer.id}`)
            this.peers.get(socket_id).removeConsumer(consumer.id)
            // tell client consumer is dead
            this.io.to(socket_id).emit('consumerClosed', {
                consumer_id: consumer.id,
                producer_socket_id
            })
        }.bind(this))

        return params

    }

    async removePeer(socket_id) {
        this.peers.get(socket_id).close()
        this.peers.delete(socket_id)
    }

    closeProducer(socket_id, producer_id) {
        this.peers.get(socket_id).closeProducer(producer_id)
    }

    broadCast(socket_id, name, data) {

        if(this.peers.get(socket_id).type ==="Instructor")
        for (let otherID of Array.from(this.peers.keys()).filter(id => id !== socket_id)) {
            this.send(otherID, name, data)
        }
        else
            for (let otherID of Array.from(this.peers.keys()).filter(id=> this.peers.get(id).type==="Instructor")) {
            console.log("sjjfhijjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjj")
            this.send(otherID, name, data)
        }

    }

    getPeerList(){
        let peerList = []
        this.peers.forEach((peer) => {
            peerList.push(peer.name)
        })
        return peerList
    }
    // async chatsession(data,socket_id){
    //     // for (let otherID of Array.from(this.peers.keys())) {
    //     //         this.send2(otherID,data)
    //     //     }
    // }
    // // send2(socket_id,data){
    // //     this.io.to(socket_id).emit('chat',data) 
    // // }

    // async typingsession(data,socket_id){
    //     // for (let otherID of Array.from(this.peers.keys()).filter(id => id !== socket_id)) {
    //     //         this.send3(otherID,data)
    //     //     }
    // }
    // // send3(socket_id,data){
    // //     this.io.to(socket_id).emit('typing',data) 
    // // }
    send(socket_id, name, data) {
        this.io.to(socket_id).emit(name, data)
    }

    getPeers(){
        return this.peers
    }



    toJson() {
        return {
            id: this.id,
            peers: JSON.stringify([...this.peers])
        }
    }


}