import express, { Application } from "express";
import socketIO, { Server as SocketIOServer } from "socket.io";
import { createServer, Server as HTTPServer } from "http";
import path from "path";
import { User } from "./model/user";

export class Server {
  private httpServer: HTTPServer;
  private app: Application;
  private io: SocketIOServer;

  private activeSockets: User[] = [];

  private readonly DEFAULT_PORT = process.env.PORT || 1000;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    this.app = express();
    this.httpServer = createServer(this.app);
    this.io = socketIO(this.httpServer);

    this.configureApp();
    this.configureRoutes();
    this.handleSocketConnection();
  }

  private configureApp(): void {
    this.app.use(express.static(path.join(__dirname, "../public")));
  }

  private configureRoutes(): void {
    this.app.get("/", (req, res) => {
      res.sendFile("index.html");
    });
  }

  private handleSocketConnection(): void {

    this.io.on("connection", (socket) => {
      console.log('count ', this.activeSockets.length);

      let userToAdd: User = new User(socket.id, '');
      this.activeSockets.push(userToAdd);

      // const existingSocket = this.activeSockets.find(
      //   existingSocket => existingSocket.socketId === socket.id
      // );

      // if (!existingSocket) {
      // let user: User = new User(socket.id, 'user');
      // this.activeSockets.push(user);
      // console.log('on connect user will get this, ', this.activeSockets.filter(
      //   s => s.socketId !== socket.id
      // ));

      // socket.emit("update-user-list", {
      //   users: this.activeSockets.filter(
      //     s => s.socketId !== socket.id
      //   )
      // });

      // console.log('other user will get my details, ', new User(socket.id, user.username));
      // for other users to show the list of updated list of online users
      // socket.broadcast.emit("add-user-list", {
      //   users: [new User(socket.id, user.username)]
      // });
      // }


      socket.on("add-user", (user: any) => {
        console.log('user add user ', user);
        // for other users to show the list of updated list of online users
        // socket['username'] = user.username;                

        let currentUserIndex: number = this.activeSockets.findIndex(x => x.socketId == socket.id);
        this.activeSockets[currentUserIndex].username = user.username;

        // this.activeSockets.forEach(x => {
        //   console.log("this.activeSockets---", x);
        // });

        socket.emit("update-user-list", {
          users: this.activeSockets.filter(
            s => (s.socketId !== socket.id && s.username != '')
          )
        });

        socket.broadcast.emit("add-user-list", {
          users: this.activeSockets.filter(
            s => (s.socketId === socket.id && s.username != '')
          )
        });

      });

      socket.on("call-user", (data: any) => {
        socket.to(data.to).emit("call-made", {
          offer: data.offer,
          socket: socket.id
        });
      });

      socket.on("make-answer", data => {
        socket.to(data.to).emit("answer-made", {
          socket: socket.id,
          answer: data.answer
        });
      });

      socket.on("reject-call", data => {
        socket.to(data.from).emit("call-rejected", {
          socket: socket.id
        });
      });

      socket.on("disconnect", () => {
        console.log('disconnect ', socket.id);
        this.activeSockets = this.activeSockets.filter(
          existingSocket => existingSocket.socketId !== socket.id
        );
        // console.log("disconnect");
        socket.broadcast.emit("remove-user", {
          socketId: socket.id
        });
      });

    });
  }

  public listen(callback: (port: any) => void): void {
    this.httpServer.listen(this.DEFAULT_PORT, () => {
      callback(this.DEFAULT_PORT);
    });
  }
}
