"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

interface ApiResponse {
  status: number
  data: any
  timestamp: string
}

export default function Component() {
  const [token, setToken] = useState<string>("")
  const [currentCommand, setCurrentCommand] = useState<string>("")
  const [responses, setResponses] = useState<ApiResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const terminalRef = useRef<HTMLDivElement>(null)

  const baseUrl = "http://localhost:3000"

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [responses])

  const addResponse = (status: number, data: any) => {
    const response: ApiResponse = {
      status,
      data,
      timestamp: new Date().toLocaleTimeString(),
    }
    setResponses((prev) => [...prev, response])
  }

  const makeRequest = async (method: string, endpoint: string, body?: any, requiresAuth = false) => {
    setIsLoading(true)
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      }

      if (requiresAuth && token) {
        headers["Authorization"] = `Bearer ${token}`
      }

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      })

      const data = await response.json()
      addResponse(response.status, data)

      if (endpoint === "/api/auth/login" && response.ok && data.token) {
        setToken(data.token)
      }
    } catch (error) {
      addResponse(0, { error: "Network error", message: error instanceof Error ? error.message : "Unknown error" })
    } finally {
      setIsLoading(false)
    }
  }

  const CommandForm = ({
    title,
    onSubmit,
    fields,
    requiresAuth = false,
  }: {
    title: string
    onSubmit: (data: Record<string, any>) => void
    fields: Array<{ name: string; type: string; placeholder: string; required?: boolean }>
    requiresAuth?: boolean
  }) => {
    const [formData, setFormData] = useState<Record<string, any>>({})

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault()
      onSubmit(formData)
      setFormData({})
    }

    return (
      <div className="border border-green-500 p-4 mb-4">
        <h3 className="text-green-400 mb-3 font-mono">{title}</h3>
        {requiresAuth && !token && <p className="text-red-400 mb-2 text-sm">⚠ Authentication required</p>}
        <form onSubmit={handleSubmit} className="space-y-2">
          {fields.map((field) => (
            <div key={field.name}>
              <label className="text-gray-300 text-sm block mb-1">{field.placeholder}:</label>
              {field.type === "textarea" ? (
                <Textarea
                  value={formData[field.name] || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, [field.name]: e.target.value }))}
                  placeholder={field.placeholder}
                  className="bg-black border-gray-600 text-white font-mono text-sm"
                  required={field.required}
                />
              ) : (
                <Input
                  type={field.type}
                  value={formData[field.name] || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      [field.name]: field.type === "number" ? Number(e.target.value) : e.target.value,
                    }))
                  }
                  placeholder={field.placeholder}
                  className="bg-black border-gray-600 text-white font-mono text-sm"
                  required={field.required}
                />
              )}
            </div>
          ))}
          <Button
            type="submit"
            disabled={isLoading || (requiresAuth && !token)}
            className="bg-green-600 hover:bg-green-700 text-black font-mono text-sm"
          >
            EXECUTE
          </Button>
        </form>
      </div>
    )
  }

  const commands = [
    {
      title: "AUTH > REGISTER",
      onSubmit: (data: any) => makeRequest("POST", "/api/auth/register", data),
      fields: [
        { name: "username", type: "text", placeholder: "Username", required: true },
        { name: "password", type: "password", placeholder: "Password", required: true },
      ],
    },
    {
      title: "AUTH > LOGIN",
      onSubmit: (data: any) => makeRequest("POST", "/api/auth/login", data),
      fields: [
        { name: "username", type: "text", placeholder: "Username", required: true },
        { name: "password", type: "password", placeholder: "Password", required: true },
      ],
    },
    {
      title: "PRODUCTS > GET ALL",
      onSubmit: () => makeRequest("GET", "/api/products"),
      fields: [],
    },
    {
      title: "PRODUCTS > GET BY ID",
      onSubmit: (data: any) => makeRequest("GET", `/api/products/${data.id}`),
      fields: [{ name: "id", type: "text", placeholder: "Product ID", required: true }],
    },
    {
      title: "PRODUCTS > CREATE",
      onSubmit: (data: any) => {
        const payload = {
          ...data,
          images: data.images ? data.images.split(",").map((img: string) => img.trim()) : [],
        }
        makeRequest("POST", "/api/products", payload, true)
      },
      fields: [
        { name: "name", type: "text", placeholder: "Product Name", required: true },
        { name: "description", type: "textarea", placeholder: "Description", required: true },
        { name: "price", type: "number", placeholder: "Price", required: true },
        { name: "images", type: "text", placeholder: "Image URLs (comma separated)" },
      ],
      requiresAuth: true,
    },
    {
      title: "PRODUCTS > UPDATE",
      onSubmit: (data: any) => {
        const { id, ...updateData } = data
        makeRequest("PUT", `/api/products/${id}`, updateData, true)
      },
      fields: [
        { name: "id", type: "text", placeholder: "Product ID", required: true },
        { name: "name", type: "text", placeholder: "Product Name" },
        { name: "description", type: "textarea", placeholder: "Description" },
        { name: "price", type: "number", placeholder: "Price" },
      ],
      requiresAuth: true,
    },
    {
      title: "PRODUCTS > DELETE",
      onSubmit: (data: any) => makeRequest("DELETE", `/api/products/${data.id}`, undefined, true),
      fields: [{ name: "id", type: "text", placeholder: "Product ID", required: true }],
      requiresAuth: true,
    },
    {
      title: "PRODUCTS > ADD IMAGES",
      onSubmit: (data: any) => {
        const payload = {
          images: data.images.split(",").map((img: string) => img.trim()),
        }
        makeRequest("POST", `/api/products/${data.id}/images`, payload, true)
      },
      fields: [
        { name: "id", type: "text", placeholder: "Product ID", required: true },
        { name: "images", type: "text", placeholder: "Image URLs (comma separated)", required: true },
      ],
      requiresAuth: true,
    },
    {
      title: "PRODUCTS > REMOVE IMAGES",
      onSubmit: (data: any) => {
        const payload = {
          images: data.images.split(",").map((img: string) => img.trim()),
        }
        makeRequest("DELETE", `/api/products/${data.id}/images`, payload, true)
      },
      fields: [
        { name: "id", type: "text", placeholder: "Product ID", required: true },
        { name: "images", type: "text", placeholder: "Image URLs to remove (comma separated)", required: true },
      ],
      requiresAuth: true,
    },
    {
      title: "PRODUCTS > UPDATE QUANTITY",
      onSubmit: (data: any) => {
        const { id, ...updateData } = data
        makeRequest("PATCH", `/api/products/${id}/quantity`, updateData, true)
      },
      fields: [
        { name: "id", type: "text", placeholder: "Product ID", required: true },
        { name: "quantity", type: "number", placeholder: "Quantity", required: true },
      ],
      requiresAuth: true,
    },
  ]

  return (
    <div className="min-h-screen bg-black text-white font-mono">
      <div className="container mx-auto p-4">
        {/* Header */}
        <div className="border-b border-green-500 pb-4 mb-6">
          <pre className="text-green-400 text-sm">
            {`
██████╗ ██████╗  ██████╗ ██████╗ ██╗   ██╗ ██████╗████████╗
██╔══██╗██╔══██╗██╔═══██╗██╔══██╗██║   ██║██╔════╝╚══██╔══╝
██████╔╝██████╔╝██║   ██║██║  ██║██║   ██║██║        ██║   
██╔═══╝ ██╔══██╗██║   ██║██║  ██║██║   ██║██║        ██║   
██║     ██║  ██║╚██████╔╝██████╔╝╚██████╔╝╚██████╗   ██║   
╚═╝     ╚═╝  ╚═╝ ╚═════╝ ╚═════╝  ╚═════╝  ╚═════╝   ╚═╝   
                                                            
                    API TERMINAL CLIENT                     
`}
          </pre>
          <div className="flex justify-between items-center mt-4">
            <div className="text-sm">
              <span className="text-gray-400">STATUS:</span>
              <span className={token ? "text-green-400" : "text-red-400"}>
                {token ? "AUTHENTICATED" : "UNAUTHENTICATED"}
              </span>
            </div>
            <div className="text-sm">
              <span className="text-gray-400">ENDPOINT:</span>
              <span className="text-blue-400">{baseUrl}</span>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Commands Panel */}
          <div className="space-y-4">
            <h2 className="text-green-400 text-lg border-b border-gray-700 pb-2">AVAILABLE COMMANDS</h2>
            <div className="max-h-[530px] overflow-y-auto space-y-4">
              {commands.map((command, index) => (
                <CommandForm
                  key={index}
                  title={command.title}
                  onSubmit={command.onSubmit}
                  fields={command.fields}
                  requiresAuth={command.requiresAuth}
                />
              ))}
            </div>
          </div>

          {/* Terminal Output */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-green-400 text-lg border-b border-gray-700 pb-2">TERMINAL OUTPUT</h2>
              <Button
                onClick={() => setResponses([])}
                className="bg-red-600 hover:bg-red-700 text-white font-mono text-xs"
              >
                CLEAR
              </Button>
            </div>
            <div
              ref={terminalRef}
              className="bg-gray-900 border border-gray-700 p-4 h-[530px] overflow-y-auto font-mono text-sm"
            >
              {responses.length === 0 ? (
                <div className="text-gray-500">{">"} Waiting for commands...</div>
              ) : (
                responses.map((response, index) => (
                  <div key={index} className="mb-4 border-b border-gray-800 pb-2">
                    <div className="flex justify-between items-center mb-1">
                      <span
                        className={`text-xs ${response.status >= 200 && response.status < 300 ? "text-green-400" : "text-red-400"}`}
                      >
                        [{response.timestamp}] STATUS: {response.status || "ERROR"}
                      </span>
                    </div>
                    <pre className="text-gray-300 whitespace-pre-wrap text-xs overflow-x-auto">
                      {JSON.stringify(response.data, null, 2)}
                    </pre>
                  </div>
                ))
              )}
              {isLoading && <div className="text-yellow-400 animate-pulse">{">"} Processing request...</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
