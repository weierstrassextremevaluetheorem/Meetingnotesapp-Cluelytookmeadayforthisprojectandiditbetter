import { spawn, ChildProcess } from 'child_process'
import { join } from 'path'
import { app } from 'electron'
import { EventEmitter } from 'events'
import { existsSync } from 'fs'
import { is } from '@electron-toolkit/utils'
import { createInterface, Interface as ReadlineInterface } from 'readline'

interface SidecarMessage {
  type: string
  data?: string
  status?: string
  message?: string
}

/**
 * Spawns and manages the C# audio sidecar process.
 * Reads base64 PCM audio chunks from sidecar stdout.
 */
export class AudioBridgeService extends EventEmitter {
  private child: ChildProcess | null = null
  private readline: ReadlineInterface | null = null
  private isRunning = false

  private getSidecarPath(): string {
    if (is.dev) {
      // In development, look for the built sidecar
      const devPaths = [
        join(__dirname, '../../sidecar/bin/Debug/net8.0/win-x64/AudioSidecar.exe'),
        join(__dirname, '../../sidecar/bin/Release/net8.0/win-x64/AudioSidecar.exe'),
        join(__dirname, '../../sidecar/bin/Debug/net8.0/AudioSidecar.exe'),
        join(__dirname, '../../resources/sidecar/AudioSidecar.exe')
      ]
      for (const p of devPaths) {
        if (existsSync(p)) return p
      }
      // Fallback: assume dotnet run
      return devPaths[0]
    }
    // In production, sidecar is in resources
    return join(process.resourcesPath, 'sidecar', 'AudioSidecar.exe')
  }

  start(): void {
    if (this.isRunning) return

    const sidecarPath = this.getSidecarPath()
    console.log(`[AudioBridge] Spawning sidecar: ${sidecarPath}`)

    try {
      this.child = spawn(sidecarPath, [], {
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true
      })
    } catch (err) {
      this.emit('error', `Failed to spawn sidecar: ${err}`)
      return
    }

    this.isRunning = true

    // Read stdout line-by-line (JSON lines protocol)
    if (this.child.stdout) {
      this.readline = createInterface({ input: this.child.stdout })
      this.readline.on('line', (line: string) => {
        if (!line.trim()) return
        try {
          const msg: SidecarMessage = JSON.parse(line)
          this.handleMessage(msg)
        } catch (err) {
          console.error('[AudioBridge] Failed to parse stdout:', line)
        }
      })
    }

    // Capture stderr for logging
    if (this.child.stderr) {
      this.child.stderr.on('data', (data: Buffer) => {
        console.log(`[Sidecar] ${data.toString().trim()}`)
      })
    }

    this.child.on('exit', (code) => {
      console.log(`[AudioBridge] Sidecar exited with code ${code}`)
      this.isRunning = false
      this.readline?.close()
      this.readline = null
      if (code !== 0 && code !== null) {
        this.emit('error', `Sidecar exited unexpectedly (code ${code})`)
      }
    })

    this.child.on('error', (err) => {
      console.error('[AudioBridge] Sidecar process error:', err)
      this.isRunning = false
      this.emit('error', `Sidecar error: ${err.message}`)
    })
  }

  sendStart(): void {
    this.sendCommand({ type: 'start' })
  }

  sendStop(): void {
    this.sendCommand({ type: 'stop' })
  }

  kill(): void {
    this.isRunning = false
    this.readline?.close()
    this.readline = null
    if (this.child) {
      this.sendCommand({ type: 'stop' })
      setTimeout(() => {
        this.child?.kill()
        this.child = null
      }, 500)
    }
  }

  private sendCommand(cmd: { type: string }): void {
    if (!this.child?.stdin?.writable) {
      console.error('[AudioBridge] Cannot send command: stdin not writable')
      return
    }
    try {
      this.child.stdin.write(JSON.stringify(cmd) + '\n')
    } catch (err) {
      console.error('[AudioBridge] Failed to write to stdin:', err)
    }
  }

  private handleMessage(msg: SidecarMessage): void {
    switch (msg.type) {
      case 'audio':
        if (msg.data) {
          this.emit('audio', msg.data) // base64 PCM chunk
        }
        break
      case 'status':
        console.log(`[AudioBridge] Status: ${msg.status}`)
        this.emit('status', msg.status)
        break
      case 'error':
        console.error(`[AudioBridge] Sidecar error: ${msg.message}`)
        this.emit('error', msg.message)
        break
    }
  }
}
