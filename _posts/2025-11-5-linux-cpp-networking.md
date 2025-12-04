---
title: C++ Networking (Linux Tutorial)
date: 2025-11-07
lastedit: 2025-12-04
layout: post
hidden: false
tags: [tutorial, cpp]
thumb: /images/thumbs/default.webp
permalink: /:title/
---


# Table of Contents
* Table of Contents
{:toc}

---

# Introduction
After making a blog post about [a drone protocol I worked on](/nsqd){:target="_blank" rel="noopener noreferrer"}, I've wanted to make a blog post that was more like a tutorial on how to get set up with a similar custom TCP protocol like that of which we used for the drone. It is written in C++ and unlike the drone project I am going to keep this post relevant to only networking on Linux. It will be server and client based with Linux on both sides of the networking solution. The entire source code used for this blog can be accessed [here, on my github](https://github.com/NikoBK/linux-cpp-networking){:target="_blank" rel="noopener noreferrer"}.

---
# Setup
This section covers technical aspects that are required to get the same output that I get on my end. Read it carefully please.

## Text Editor
This will be for editing file contents, it really does not matter what you use. I use neovim with plugins for ease of use and better performance.

## Operating System
I am making this project on Arch Linux which dictates my choice of compiler. We have to set that up very soon. Arch Linux is rolling release so you can do a system update to ensure you are on the latest version as I am. Despite always being recommended to follow the release, it probably won't matter if you are behind the latest version for this project.

## Compiler
To compile our code we are going to use GCC, a GNU C/C++ compiler that builds our `.cpp` files into binaries we can run. Furthermore we are going to use CMake to make a build system generator that ensures we generate build scripts (Makefiles). This can be installed using `sudo pacman -S gcc cmake` which will also enable support for C++ 23 on arch. You can check the version with `g++ --version`, if it says 14.x or later you are good.

## Programming Language
As far as C++ goes I am going to use C++ version 23 since it is the latest stable release, but the version you do this on should not matter too much, it should work exactly the same on C++ version 20 too which is even more widely supported than v23. Support for the latest C++ version is installed with the gcc step above.

## Testing the Setup
Let's make a simple test and try to compile a `.cpp` file into a binary. Create a directory (folder) called `server`, and then make a `main.cpp` file inside of that directory that looks like this:
```cpp
#include <iostream>

int main() {
    std::cout << "Hello world!\n";
    return 0;
}
```

Save this to the file from whatever editor you use, and run the following command in the root of your project directory: `g++ -std=c++23 server/main.cpp -o hello`.
This will create a binary file in the root of your project folder called `hello` which we can run with `./hello` in the terminal, this should display "Hello World!". If this works we can now compile and start working on the networking implementation.

---
# I: Creating the Server Socket
Let's continue from where we wrote our `Hello world!` prompt.

## Preparing the Directory
Create two directories inside of the `server` directory called: `src` and `include`. We are going to use these for source files and header files that are included in various source files across the server application.

Move the `main.cpp` into the `src` directory. Now create a file called `constants.hpp` inside of the `server/include` directory and start out by adding the following:
```cpp
#ifndef CONSTANTS_HPP
#define CONSTANTS_HPP

// Networking
#define SERVER_PORT 5000

// constants.hpp
#endif
```

We will access this `hpp` file in a second to create a socket on port `5000` (you can use any other port you prefer if you want).
Next up, let's make a `CMakeLists.txt` in the `server/` directory so we do not have to use the `g++` command everytime (because we have header files now). For `CMakeLists.txt` add the following:
```cmake
cmake_minimum_required(VERSION 3.16)
project(server LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 23)

# Add executable
add_executable(server src/main.cpp)

# Include headers
target_include_directories(server PRIVATE include)
```

Save the file and now make a `build` folder inside the `server/` folder. Try adding some simple code to `main.cpp` to test the link to the header file `constants.hpp`:
```cpp
#include <iostream>
#include <constants.hpp>

int main() {
    std::cout << "Port is: " << constants::server_port << std::endl;
    return 0;
}
```

From the `server/` folder try to run the following commands in a terminal:
```linux
cd build
cmake ..
cmake --build .
```

If done correctly there is a `server` binary in the `builds/` directory that you can run which should display the port defined in `constants.hpp`. You can now always just run the `cmake --build .` command (always from within the `build/` directory) to rebuild your server application. Feel free to delete the `hello` binary in the very root of the project folder unless you feel sentimental...

---
## The Server
Start by creating two files:
- `include/server.hpp`
- `src/server.cpp`

The header file will be our class interface which declares private members for the socket itself, connection status and more. The source file will be where we implement functions.
For `server.hpp` it should look like this:
```cpp
#ifndef SERVER_HPP
#define SERVER_HPP

#include <stdio.h>
#include <stdlib.h>
#include <sys/types.h>
#include <iostream>
#include <fstream>
#include <errno.h>

#include <sys/time.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <unistd.h>
#include <arpa/inet.h>
#include <fcntl.h>
#include <string>

// Forward decleration
class Message;

class Server
{
public:
    Server(int port);
    ~Server(); // server class destructor

    bool connected() const { return _connected; }

    void AcceptConnection();
    void HandleConnection();
    void Send(Message& message);
    void Disconnect(const std::string& reason);
    void SendError(std::string text);

private:
    int _socket;
    bool _connected;
    int _currentSize;
    int _serverSocket;
};

#endif
```

Next, create a `message.hpp` file in the `include/` directory (we will fill in this file with code later):
```cpp
#ifndef MESSAGE_HPP
#define MESSAGE_HPP

#endif
```

Now we are ready to make our `src/server.cpp` file's code that will set up the socket:
```cpp
#include <constants.hpp>
#include <server.hpp>
#include <message.hpp>

Server::Server(int port) : _socket(0), _connected(false), _currentSize(0)
{
    // Define the TCP _socket
    _serverSocket = socket(AF_INET, SOCK_STREAM, 0);
    if (_serverSocket == -1) {
        std::cerr << "Failed to create socket: " << errno << std::endl;
        exit(-1);
    }

    // set socket to reusable
    int yes = 1;
    if (setsockopt(_serverSocket, SOL_SOCKET, SO_REUSEADDR, &yes, sizeof(int)) == -1) {
        std::cerr << "Failed to set reuse address: " << errno << std::endl;
        close(_serverSocket);
        exit(-1);
    }

    // get current flags
    int flags = fcntl(_serverSocket, F_GETFL, 0);
    if (flags == -1) {
        std::cerr << "Failed to get current flags: " << errno << std::endl;
        close(_serverSocket);
        exit(-1);
    }

    // enable non blocking flag
    //flags |= O_NONBLOCK;
    //if (fcntl(_serverSocket, F_SETFL, flags) == -1) {
    if (fcntl(_serverSocket, F_SETFL, fcntl(_serverSocket, F_GETFL) | O_NONBLOCK) == -1) {
        std::cerr << "Failed to set non-blocking: " << errno << std::endl;
        close(_serverSocket);
        exit(-1);
    }

    struct sockaddr_in serverAddress;
    serverAddress.sin_family = AF_INET;
    serverAddress.sin_addr.s_addr = INADDR_ANY;
    serverAddress.sin_port = htons(port);

    // bind to address and port
    if (bind(_serverSocket, (struct sockaddr*)&serverAddress, sizeof(serverAddress)) < 0) {
        std::cerr << "Failed to bind socket." << std::endl;
        close(_serverSocket);
        exit(-1);
    }

    // backlog of 5
    if (listen(_serverSocket, 5) == -1) {
        std::cerr << "Failed to listen" << std::endl;
        close(_serverSocket);
        exit(-1);
    }
    std::cout << "Server Running on port: " << port << std::endl;
}

Server::~Server() {}
```

TODO: address what this does...

Change your `CMakeLists.txt` to include the server cpp file, for that, make it be:
```cmake
cmake_minimum_required(VERSION 3.16)
project(server LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 23)

add_executable(server
    src/main.cpp
    src/server.cpp
)

target_include_directories(server PRIVATE include)
````

Now rebuild from the `build/` directory with: `cmake ..`, and then `cmake --build .` (create new build files for server.cpp and new headers).

At this point we should have a functioning socket setup, however this will not be effective as we have no accepting of incoming connections, nor do we tick over a period of time. For this we need to create a tickloop for our backend application and setup socket acceptance and data receival on the socket we have just created.

To start, we are going to create a tickloop in `main.cpp`:
```cpp
#include <iostream>
#include <atomic>
#include <chrono>
#include <thread>

#include <constants.hpp>
#include <server.hpp>

int main() {
    std::atomic<bool> running = true;
    
    Server server(constants::server_port);
    
    // 50 hz tick loop (20 ms per tick)
    const auto tick = std::chrono::milliseconds(20);
    
    while (running)
    {
        // Networking
        if (!server.connected()) {
            server.AcceptConnection();
        }
        else {
            server.HandleConnection();
        }
        
        std::this_thread::sleep_for(tick);
    }
    // terminate
    return 0;
}
```

Next we want to add `AcceptConnection()` and `HandleConnection()`. Add the following code to the bottom of `server.cpp`:
```cpp
void Server::AcceptConnection()
{
    struct sockaddr_in addr;
    socklen_t addrLen = sizeof(addr);
    
    int socket = accept(_serverSocket, (struct sockaddr*)&addr, &addrLen);
    if (socket == -1) {
        int errorCode = errno;
        if (errorCode != EWOULDBLOCK) {
            std::string message = "FATAL ERROR: Failed to accept: " + errorCode;
            Disconnect(message);
            exit(-1);
        }
        return;
    }
    
    // get current flags
    int flags = fcntl(socket, F_GETFL, 0);
    if (flags == -1) {
        std::cerr << "Failed to get current flags: " << errno << std::endl;
        close(socket);
        return;
    }
    
    // enable non blocking flag
    flags |= O_NONBLOCK;
    if (fcntl(socket, F_SETFL, flags) == -1) {
        std::cerr << "Failed to set non-blocking: " << errno << std::endl;
        close(socket);
        return;
    }
    
    std::cout << "Client Connection Established" << std::endl;
    _connected = true;
    _socket = socket;
}

void Server::HandleConnection()
{
    if (_currentSize == 0)
    {
        int bytesReadable = 0;
        int result = recv(_socket, reinterpret_cast<char*>(&bytesReadable), sizeof(int), MSG_PEEK);
        
        if (result <= 0) 
        {
            int err = errno;
            if (err == EWOULDBLOCK) {
                //std::cout << "[DEBUG] No content - non blocking return" << std::endl;
                return;
            }
            
            // returning 0 or WSAECONNRESET means closed by host
            if (result == 0 || err == ECONNRESET) {
                Disconnect("");
            }
            else
            {
                // everything else is error
                std::string message = "FATAL ERROR: Recv Error: " + std::to_string(err);
                Disconnect(message);
            }
            return;
        }
        
        if (result < sizeof(int)) {
            return;
        }
        
        _currentSize = ntohl(bytesReadable); // - 4 as thats original size
        if (_currentSize <= 0 || _currentSize > 8192) {
            std::string message = "Size under or overflow: " + _currentSize;
            Disconnect(message);
            return;
        }
    }
    
    std::vector<char> b(_currentSize);
    int result = recv(_socket, b.data(), _currentSize, 0);
    if (result <= 0) {
        int err = errno;
        if (err == EWOULDBLOCK) {
            return;
        }
        
        // returning 0 or WSAECONNRESET means closed by host
        if (result == 0 || err == ECONNRESET) {
            Disconnect("");
        }
        else {
            // everything else is error
            std::string message = "FATAL ERROR: Recv Error: " + std::to_string(err);
            Disconnect(message);
        }
        return;
    }
    
    // + 4 as thats offset to what we already read
    Decoder decoder(b.data() + 4, _currentSize);
    
    // Check the first byte (identifier)
    unsigned char messageId;
    decoder.ReadByte(&messageId);
    std::cout << "Received message (ID): " << (int)messageId << '\n';
    
    // Handle the message
    switch ((int)messageId) 
    {
        default: {
            std::cerr << "Unrecognized message id: " << (int)messageId << std::endl;
            break;
        }
    }
    _currentSize = 0;
}

void Server::Send(Message& message)
{
    Encoder encoder;
    message.encode(encoder);
    
    const char* buffer = encoder.buffer();
    int size = encoder.size();
    
    int result = send(_socket, buffer, size, 0);
    if (result <= 0) {
        int err = errno;
        if (err == EWOULDBLOCK) {
            return;
        }
        
        // returning 0 or WSAECONNRESET means closed by host
        if (result == 0 || err == ECONNRESET) {
            Disconnect("");
        }
        else
        {
            // everything else is error
            std::string m = "FATAL ERROR: send Error: " + std::to_string(err);
            Disconnect(m);
        }
        return;
    }
    //std::cout << "Sent: " << result << " bytes";
}
```

This is going to create some errors, but we are fixing those now. First add `#include <vector>` to the top of `server.cpp`.
Next we need to create the message decoder, go to `message.hpp` and replace the entire file contents with this:
```cpp
#ifndef MESSAGE_HPP
#define MESSAGE_HPP

#include <vector>
#include <string.h>
#include <iterator>
#include <stdexcept>

class Encoder {
public:
    Encoder() : _position(0) {
        // Reserve enough space for the size of this buffer
        WriteInt(0);
    }
    
    void WriteBoolean(bool value) {
        Write((char*)&value, sizeof(bool));
    }
    
    void WriteByte(char value) {
        Write((char*)&value, sizeof(char));
    }
    
    void WriteShort(short value) {
        value = htons(value);
        Write((char*)&value, sizeof(short));
    }
    
    void WriteInt(int value) {
        value = htonl(value);
        Write((char*)&value, sizeof(int));
    }
    
    void WriteString(const std::string& value) {
        short size = value.length();
        WriteShort(size);
        Write((char*)value.c_str(), size);
    }
    
    const char* buffer() const {
        // get the position and then copy to the front of the _buffer
        int length = htonl(_position);
        //std::cout << "length is: " << length << std::endl;
        memcpy((char*)_buffer.data(), &length, sizeof(int));
        return _buffer.data();
    }
    
    const int size() const {
        return _buffer.size();
    }
    
private:
    void Write(char *data, unsigned int size) {
        // Reserve space in the buffer to avoid reallocations
        _buffer.reserve(_buffer.size() + size);
        
        // Copy data into buffer using std::copy
        std::copy(data, data + size, std::back_inserter(_buffer));
        
        // Update position
        _position += size;
    }
    
private:
    int _position;
    std::vector<char> _buffer;
};

class Decoder {
public:
    Decoder(const char* data, int size) : _buffer(data, data + size), _position(0)
    { }
    
    void ReadBoolean(bool* value) {
        Read(reinterpret_cast<char*>(value), sizeof(bool));
    }
    
    void ReadByte(unsigned char* value) {
        Read(reinterpret_cast<char*>(value), sizeof(unsigned char));
    }
    
    void ReadShort(short* value) {
        Read(reinterpret_cast<char*>(value), sizeof(short));
        *value = ntohs(*value);
    }
    
    void ReadInt(int* value) {
        Read(reinterpret_cast<char*>(value), sizeof(int));
        *value = ntohl(*value);
    }
    
    void ReadString(std::string* value) {
        short size;
        ReadShort(&size);
        value->assign(&_buffer[_position], size);
        _position += size;
    }
    
private:
    void Read(char* data, unsigned int size) {
        if (_position + size > _buffer.size()) {
            throw std::runtime_error("Not enough data in buffer");
        }
        memcpy(data, &_buffer[_position], size);
        _position += size;
    }
    
private:
    std::vector<char> _buffer;
    int _position;
};

struct Message {
    virtual void encode(Encoder& encoder) = 0;
    virtual void decode(Decoder& decoder) = 0;
};

#endif
```

Here we have added a message encoder which will be used to write data later. Now let us add a disconnect method to `server.cpp`. Add this to the bottom of the file:
```cpp
void Server::Disconnect(const std::string& reason)
{
    if (!_connected){
        return;
    }
    
    _socket = -1;
    _connected = false;
    _currentSize = 0;
    
    if (!reason.empty()) {
        std::cout << "Client Disconnected: " << reason << std::endl;
    }
    close(_socket);
}
```

With this added, we should be able to compile the backend by standing in `server/build/` and running the `cmake --build .` command, you may or may not have to run `cmake ..` first if you skipped that previously. With that done we can now move on to the frontend (client) application.

---
# II: Creating the Client
For this, you guessed it, we need to make a `client` directory within the same directory of which we made the `server` directory. Like with `server`, create two subfolders in the `client` directory: `include` and `src`. Additionally, make a `CMakeLists.txt` file there too:
```cmake
cmake_minimum_required(VERSION 3.16)
project(server LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 23)

add_executable(server
    src/main.cpp
    src/client.cpp
)

target_include_directories(server PRIVATE include)
```

Create two files, `main.cpp` and `client.cpp` in the `src` directory. Next, create `message.hpp` in `include` - copy all the contents from `server/include/message.hpp` and paste them here, we want both the server and client to have 1:1 message representation (they should read and write data formats the exact same).

**Important:** before moving on though, add `#include <arpa/inet.h>` to the top of `message.hpp` to ensure we can use network to host order - this was previously included in `server.hpp` on the backend unlike here.

In `include`, create: `constants.hpp` and `client.hpp`. For `client.hpp` add the following:
```cpp
#ifndef CLIENT_HPP
#define CLIENT_HPP

#include <string>
#include <thread>

// Forward declaration
class Message;

class Client
{
public:
    Client();
    ~Client();

    bool Connect(const std::string& host, int port);
    void HandleReceive();
    void Send(Message& message);
    void Disconnect(const std::string& reason);

    bool connected() const { return _connected; }

private:
    int  _socket;
    bool _connected;
    int  _currentSize;
};

#endif
```

Now add this to `main.cpp`:
```cpp
#include <iostream>
#include <atomic>
#include <chrono>
#include <thread>

#include <constants.hpp>
#include <client.hpp>

int main() {
    std::atomic<bool> running = true;

    Client client;

    const std::string host = "127.0.0.1";
    int port = constants::server_port;

    client.Connect(host, port);

    // 50 Hz tick loop
    const auto tick = std::chrono::milliseconds(20);

    while (running)
    {
        if (!client.connected()) {
            client.Connect(host, port);
        }
        else {
            client.HandleReceive();
        }
        std::this_thread::sleep_for(tick);
    }

    return 0;
}
```

And for `client.cpp`:
```cpp
#include <iostream>
#include <cstring>
#include <client.hpp>
#include <message.hpp>
#include <constants.hpp>

#include <sys/types.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <unistd.h>
#include <fcntl.h>
#include <errno.h>

Client::Client()
: _socket(-1), _connected(false), _currentSize(0)
{}

Client::~Client()
{
    if (_connected) {
        close(_socket);
    }
}

bool Client::Connect(const std::string& host, int port)
{
    // create socket
    _socket = socket(AF_INET, SOCK_STREAM, 0);
    if (_socket == -1) {
        std::cerr << "Failed to create socket: " << errno << "\n";
        return false;
    }

    // set non-blocking
    int flags = fcntl(_socket, F_GETFL, 0);
    fcntl(_socket, F_SETFL, flags | O_NONBLOCK);

    // server address
    sockaddr_in addr{};
    addr.sin_family = AF_INET;
    addr.sin_port   = htons(port);

    if (inet_pton(AF_INET, host.c_str(), &addr.sin_addr) != 1) {
        std::cerr << "Invalid address\n";
        close(_socket);
        return false;
    }

    // attempt connect
    int result = connect(_socket, (sockaddr*)&addr, sizeof(addr));

    if (result == 0) {
        // connected instantly
        std::cout << "Succesfully connected to " << host << ":" << port << "\n";
        _connected = true;
        return true;
    }

    // non-blocking in-progress connect
    if (result == -1 && errno == EINPROGRESS) {
        std::cout << "Connecting to " << host << ":" << port << "...\n";
        // loop will call HandleReceive until fully connected
        _connected = true;  // mark as "attempting"
        std::cout << "Succesfully connected to " << host << ":" << port << "\n";
        return true;
    }

    std::cerr << "Connect failed: " << strerror(errno) << "\n";
    close(_socket);
    return false;
}

void Client::HandleReceive()
{
    if (!_connected)
        return;

    // peek size
    if (_currentSize == 0)
    {
        int bytesReadable = 0;
        int result = recv(_socket, reinterpret_cast<char*>(&bytesReadable), sizeof(int), MSG_PEEK);

        if (result <= 0) {
            if (errno == EWOULDBLOCK)
                return;

            // socket closed
            Disconnect("connection lost");
            return;
        }

        if (result < sizeof(int))
            return;

        _currentSize = ntohl(bytesReadable);
        if (_currentSize <= 0 || _currentSize > 8192) {
            Disconnect("invalid message size");
            return;
        }
    }

    // read full message
    std::vector<char> buffer(_currentSize);
    int result = recv(_socket, buffer.data(), _currentSize, 0);

    if (result <= 0) {
        if (errno == EWOULDBLOCK)
            return;

        Disconnect("recv failed");
        return;
    }

    // decode (you implement Decoder)
    Decoder decoder(buffer.data() + 4, _currentSize);

    unsigned char messageId;
    decoder.ReadByte(&messageId);

    std::cout << "Client got message ID = " << (int)messageId << "\n";
    //TODO handle message here

    _currentSize = 0;
}

void Client::Send(Message& message)
{
    if (!_connected)
        return;

    Encoder encoder;
    message.encode(encoder);

    const char* buf = encoder.buffer();
    int size = encoder.size();

    int result = send(_socket, buf, size, 0);
    if (result <= 0) {
        if (errno != EWOULDBLOCK) {
            Disconnect("send failed");
        }
    }
}

void Client::Disconnect(const std::string& reason)
{
    if (!_connected)
        return;

    std::cout << "Client disconnect: " << reason << "\n";

    close(_socket);
    _socket = -1;
    _connected = false;
    _currentSize = 0;
}
```

Now create a `build` directory in `client` and run the cmake commands just like we did the first time around with `server`.
At this point you should have executable binaries for both the client and server. Open two terminals and run the server binary on one first, followed by the other terminal then running the client binary.

If you did everything correct you should see the server say "Client Connection Established" once the client starts, and the client should say: "Succesfully connected to 127.0.0.1:5000". With that done, lets try and send some data back and forth.

---

# III: Sending Data Back and Forth
Now let's try to make two messages that each contains some variables that we can read and write back and forth to make the server and client communicate with eachother.

In `constants.hpp` for both `server` and `client` add the following two constants:
```cpp
constexpr int hello_id = 1;
constexpr int reply_id = 2;
```

Then in `message.hpp`, again for both `server` and `client` add the following two messages in the very bottom of the files just before `#endif`:
```cpp
struct HelloMessage : public Message
{
    std::string text;
    int addA;
    int addB;
    bool solved;

    virtual void encode(Encoder& encoder) override {
        encoder.WriteByte(constants::hello_id);
        encoder.WriteString(text);
        encoder.WriteInt(addA);
        encoder.WriteInt(addB);
        encoder.WriteBoolean(solved);
    }

    virtual void decode(Decoder& decoder) override {
        decoder.ReadString(&text);
        decoder.ReadInt(&addA);
        decoder.ReadInt(&addB);
        decoder.ReadBoolean(&solved);
    }
};

struct ReplyMessage : public Message
{
    std::string text;
    int result;
    bool solved;

    virtual void encode(Encoder& encoder) override {
        encoder.WriteByte(constants::reply_id);
        encoder.WriteString(text);
        encoder.WriteInt(result);
        encoder.WriteBoolean(solved);
    }

    virtual void decode(Decoder& decoder) override {
        decoder.ReadString(&text);
        decoder.ReadInt(&result);
        decoder.ReadBoolean(&solved);
    }
};
```

**Important:** for `client` only, add: `#include <constants.hpp>` in the top of `message.hpp`.

In `client/client.cpp` search and find: `//TODO handle message here` and replace that line with this:
```cpp
switch ((int)messageId)
{
    case reply_id: {
        ReplyMessage msg;
        msg.decode(decoder);
        
        std::cout << "Server says:\nText: " << msg.text << "\nResult: " << msg.result << "\nSolved? - " << msg.solved << std::endl;
    }
}
```

Then go to `server/server.cpp` and on line `170` you should see: `switch ((int)packetId)`, add a case for the hello message here:
```cpp
// Handle the packet
switch ((int)packetId)
{
    case constants::hello_id: {
        HelloMessage msg;
        msg.decode(decoder);
        int res = msg.addA + msg.addB;

        std::cout << "Client says:\nText: " << msg.text << "\nAddition of: " << msg.addA << " + " << msg.addB << " which is: " << res << ", therefor solved." << std::endl;

        ReplyMessage reply;
        reply.text = "This is the server!";
        reply.result = res;
        reply.solved = true;
        Send(reply);

        break;
    }
    default: {
        std::cerr << "Unrecognized packet id: " << (int)packetId << std::endl;
        break;
    }
}
```

Build this and run the `server` and `client` like before and you should the server and client communicating!

---
# Floating Point Representation
You may have noticed there is no float representation in the encoder nor the decoder. This is because back when my team and I came up with this custom protocol we could not figure out how to correctly send floating point numbers, so I am dedicating this section of the post to exactly that.

In order to send a floating point number (datatype: float) the idea is to treat the float as its raw 32-bit representation, then byte-swap the bits manually using an integer type and at last reinterpreting the bits back as a float when decoding it on the receiving end.

We do this by adding this to the encoder amidst the other `Write...` methods:
```cpp
void WriteFloat(float value) {
    uint32_t asInt;
    static_assert(sizeof(float) == sizeof(uint32_t), "Float must be 32-bit");

    // Copy float bits into an integer
    memcpy(&asInt, &value, sizeof(float));

    // Convert to network byte order
    asInt = htonl(asInt);

    Write(reinterpret_cast<char*>(&asInt), sizeof(uint32_t));
}
```

then on the `decoder` we do the following:
```cpp
void ReadFloat(float* value) {
    uint32_t asInt;
    Read(reinterpret_cast<char*>(&asInt), sizeof(uint32_t));

    // Convert from network byte order
    asInt = ntohl(asInt);

    // Copy bits back into the float
    memcpy(value, &asInt, sizeof(float));
}
```

This should allow for reading and writing floats. To test this we can implement a float variable into our Hello and Reply messages from above:
```cpp
struct HelloMessage : public Message
{
    std::string text;
    int addA;
    int addB;
    bool solved;
    float test;

    virtual void encode(Encoder& encoder) override {
        encoder.WriteByte(constants::hello_id);
        encoder.WriteString(text);
        encoder.WriteInt(addA);
        encoder.WriteInt(addB);
        encoder.WriteBoolean(solved);
        encoder.WriteFloat(test);
    }

    virtual void decode(Decoder& decoder) override {
        decoder.ReadString(&text);
        decoder.ReadInt(&addA);
        decoder.ReadInt(&addB);
        decoder.ReadBoolean(&solved);
        decoder.ReadFloat(&test);
    }
};

struct ReplyMessage : public Message
{
    std::string text;
    int result;
    bool solved;
    float test;

    virtual void encode(Encoder& encoder) override {
        encoder.WriteByte(constants::reply_id);
        encoder.WriteString(text);
        encoder.WriteInt(result);
        encoder.WriteBoolean(solved);
        encoder.WriteFloat(test);
    }

    virtual void decode(Decoder& decoder) override {
        decoder.ReadString(&text);
        decoder.ReadInt(&result);
        decoder.ReadBoolean(&solved);
        decoder.ReadFloat(&test);
    }
};
```

Then in `server.cpp`:
```cpp
case constants::hello_id: {
    HelloMessage msg;
    msg.decode(decoder);
    int res = msg.addA + msg.addB;

    std::cout << "Client says:\nText: " << msg.text << "\nAddition of: " << msg.addA << " + " << msg.addB << " which is: " << res << ", therefor solved." << std::endl;

    ReplyMessage reply;
    reply.text = "This is the server!";
    reply.result = res;
    reply.solved = true;
    reply.test = 123.456f;
    Send(reply);

    break;
}
```

and in `client.cpp`:
```cpp
switch ((int)messageId)
{
    case constants::reply_id: {
        ReplyMessage msg;
        msg.decode(decoder);

        std::cout << "Server says:\nText: " << msg.text << "\nResult: " << msg.result << "\nSolved? - " << msg.solved << std::endl;
        std::cout << "PS: Message float value is: " << msg.test << std::endl;
    }
}
```

Build this, and run the server first, then client. You should see the float value correctly displayed now!

---

# The End
As mentioned in the start of this tutorial you can find the source code [here](https://github.com/NikoBK/linux-cpp-networking/tree/){:target="_blank" rel="noopener noreferrer"}. I hope this tutorial is helpful to somebody out here. It will be used for future references on the topic of networking basics in C++. Thank you for reading!

