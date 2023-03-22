package main

import (
	"log"
	"net/http"
	"os"
	"os/exec"
	"runtime"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

func main() {
	shell := "bash"
	if runtime.GOOS == "windows" {
		shell = "powershell.exe"
	}

	r := gin.Default()

	r.GET("/ws", func(c *gin.Context) {
		upgrader := websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				return true
			},
		}
		conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			log.Println("Failed to upgrade websocket connection:", err)
			return
		}
		defer conn.Close()

		cmd := exec.Command(shell)
		cmd.Env = os.Environ()
		pty, err := cmd.StdinPipe()
		if err != nil {
			log.Println("Failed to create pty:", err)
			return
		}
		defer pty.Close()

		go func() {
			for {
				_, message, err := conn.ReadMessage()
				if err != nil {
					log.Println("Failed to read message from websocket:", err)
					return
				}
				pty.Write(message)
			}
		}()

		go func() {
			stdout, err := cmd.StdoutPipe()
			if err != nil {
				log.Println("Failed to create stdout pipe:", err)
				return
			}
			defer stdout.Close()

			buf := make([]byte, 1024)
			for {
				n, err := stdout.Read(buf)
				if err != nil {
					log.Println("Failed to read from command stdout:", err)
					return
				}
				conn.WriteMessage(websocket.TextMessage, buf[:n])
			}
		}()

		if err := cmd.Run(); err != nil {
			log.Println("Command execution failed:", err)
		}
	})

	port := "1313"
	log.Println("Starting server on port:", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
