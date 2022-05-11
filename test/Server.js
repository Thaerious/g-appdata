import dotenv from "dotenv";
import Express from "express";
import http from "http";
import Logger from "@thaerious/logger";

dotenv.config();
const logger = Logger.getLogger();

class Server{
    constructor(){
        this.app = Express();

        this.app.use(`*`, (req, res, next) => {
            logger.channel(`this.server`).log(`${req.method} ${req.originalUrl}`);
            next();
        });
    
        this.app.set("views", "test/www");
        this.app.set("view engine", "ejs");

        this.app.use("/index", (req, res)=>{
            const data = {
                client_id : process.env.CLIENT_ID
            }

            res.render("index.ejs", data, (err, html)=>{
                if (err){
                    res.send(err);
                    console.log(err);
                }
                else{
                    res.send(html)
                }
            });      
        });

        this.app.use("/scratch", (req, res)=>{
            const data = {
                client_id : process.env.CLIENT_ID
            }

            res.render("scratch.ejs", data, (err, html)=>{
                if (err){
                    res.send(err);
                    console.log(err);
                }
                else{
                    res.send(html)
                }
            });      
        });

        this.app.use(Express.static("test/www"));
        this.app.use(Express.static("node_modules"));   
        this.app.use(Express.static("src"));   

        this.app.use(`*`, (req, res) => {
            logger.channel(`this.server`).log(`404 ${req.originalUrl}`);
            res.statusMessage = `404 Page Not Found: ${req.originalUrl}`;
            res.status(404);
            res.send(`404: page not found`);
            res.end();
        });
    }

    start(port = 8000, ip = "0.0.0.0"){
        this.server = http.createServer(this.app);
        this.server.listen(port, ip, () => {
            logger.channel(`this.server`).log(`Listening on port ${port}`);
        });
    
        process.on(`SIGINT`, () => this.stop(this.server));
        process.on(`SIGTERM`, () => this.stop(this.server));
        return this;        
    }

    stop(){
        logger.channel(`this.server`).log(`Stopping this.server`);
        this.server.close();
        process.exit();
    }
}

new Server().start();