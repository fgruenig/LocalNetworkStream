# LocalNetworkStream

## Starting point

Since the currently used analog translation system is arriving at its end of life, a new system is needed. The system will only be used a few days of the year, therefore the plan is to use the hardware that most clients would already have hat hand: the smartphone. There are a few conditions that should be met.

* no active internet connection while the system is working
* users should not have to install a new app

## Basic concept

The idea of this project is to Stream/Broadcast audio over a local network connection using WebRTC technology.
Using WebRTC ensures that the clients, who will be listening, do not need to install any software. 
It will just be supported by all devices, since all mainstream browsers incorporate the technology.

## Requirements

1. Hardware
  * A small server (for example a Raspberry Pi)
  * Router that lets the users Connect to the streaming device and points to the DNS server running on the small server
  * A device with a microphone (any smartphone or the small server)

2. Software
  * [Node.js](https://nodejs.org/ "Node.js Homepage") running on the small server 
  * DNS server that points the following connectivity check links to the small server
    * [http://connectivitycheck.gstatic.com/generate_204](http://connectivitycheck.gstatic.com/generate_204)
    * [https://www.apple.com/library/test/success.html](https://www.apple.com/library/test/success.html)

## Quickinstall

To get started with this project clone this repository then run `npm install` in the folder of the local copy on your small server to install all required Node.js modules. After that you can run `node index.js`. Connect a streaming device under [https://IP-OF-SMALL-SERVER/stream.html](). Then the clients can get connected under [https://IP-OF-SMALL-SERVER/]()
