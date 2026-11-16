---
slug: rpc-and-grpc
title: "RPC & gRPC"
topic: networking-and-apis
kind: api
summary: "High-performance microservice communication with Protocol Buffers, HTTP/2 multiplexing, and strongly typed IDLs."
tags: [rpc, grpc, protobuf, microservices]
related: [rest-and-resource-modeling, graphql-principles, microservices-architecture]
---
> **In one line:** gRPC uses Protocol Buffers and HTTP/2 to deliver strongly typed, high-throughput, low-latency communication for internal microservices.

## The idea
While REST over JSON is ideal for public, browser-facing web APIs, it introduces significant inefficiencies for internal microservice-to-microservice communication. Parsing text-based JSON strings consumes substantial CPU cycles, JSON schemas are loosely enforced at runtime, and JSON payloads include redundant key strings in every message.

**Remote Procedure Call (RPC)** models communication as executing a function on a remote server as if it were a local subroutine call. Developed by Google, **gRPC** has become the industry standard RPC framework for backend architectures.

gRPC is built upon two core technologies:
1. **Protocol Buffers (Protobuf):** A language-agnostic Interface Definition Language (IDL) and binary serialization format. Engineers define services and data structures in a `.proto` file. The Protobuf compiler (`protoc`) generates strongly typed client stubs and server boilerplate in Go, Java, Python, C++, and TypeScript. In binary format, fields are identified by integer tags rather than field names, resulting in payloads that are 5x to 10x smaller and serialize up to 10x faster than JSON.
2. **HTTP/2 Transport:** gRPC communicates exclusively over HTTP/2. This provides native bidirectional streaming, header compression via HPACK, and TCP multiplexing (thousands of parallel RPC calls share a single long-lived TCP connection).

## See it
Consider a Protocol Buffer service definition and its compact binary serialization:

```text
// Definition in order_service.proto
syntax = "proto3";

service OrderService {
  rpc GetOrder (OrderRequest) returns (OrderResponse);
  rpc StreamOrderUpdates (OrderRequest) returns (stream OrderStatus);
}

message OrderRequest {
  string order_id = 1;
}

message OrderResponse {
  string order_id = 1;
  int64 total_cents = 2;
  string status = 3;
}
```

```yaml
# gRPC vs REST performance benchmark comparison
comparison:
  serialization_format:
    rest: "JSON (Text-based UTF-8)"
    grpc: "Protobuf (Compact Binary)"
  cpu_parsing_overhead:
    rest: "High (String parsing, regex, object allocation)"
    grpc: "Ultra-low (Direct memory byte mapping)"
  wire_payload_size:
    rest: "348 bytes"
    grpc: "42 bytes (88% reduction)"
  transport_protocol:
    rest: "HTTP/1.1 or HTTP/2"
    grpc: "Strictly HTTP/2 (Multiplexed streams)"
```

> **Tip:** In microservice topologies where thousands of internal network hops occur per second, switching internal communication from REST/JSON to gRPC frequently cuts backend CPU utilization by 20% to 40%.

## Go deeper
gRPC supports four invocation patterns: Unary (standard request-response), Server Streaming (client sends one request, server streams multiple responses), Client Streaming (client streams multiple chunks, server replies once), and Bidirectional Streaming (both client and server send independent message streams over a single channel).
## Watch out
- Never change the integer tag number of an existing Protobuf field (e.g., `string order_id = 1;`); tags are the binary keys used for serialization.
- Web browsers cannot natively speak arbitrary HTTP/2 framing without a translation proxy (gRPC-Web), making REST/GraphQL preferred for frontend clients.
## Remember
- gRPC combines binary Protocol Buffers with HTTP/2 multiplexing for ultra-fast internal microservice calls.
- Protobuf provides compile-time type safety and contracts across heterogeneous programming languages.
- Use REST or GraphQL at the public edge; use gRPC for internal service-to-service communication.
