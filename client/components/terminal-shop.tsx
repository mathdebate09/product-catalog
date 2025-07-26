"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Database, Search, User, Plus, Trash2, Terminal, Eye, Edit, Archive } from "lucide-react"
import { toast } from "sonner"

interface Product {
  _id: string
  name: string
  description: string
  price: number
  images: string[]
  quantity?: number
}

interface TerminalLine {
  type: "command" | "output" | "error" | "success"
  content: string
  timestamp: string
}

export default function CatalogManager() {
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [user, setUser] = useState<{ username: string; token: string } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showAuthDialog, setShowAuthDialog] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [authMode, setAuthMode] = useState<"login" | "register">("login")
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([])
  const [currentView, setCurrentView] = useState<"catalog" | "manage" | "analytics">("catalog")
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const terminalRef = useRef<HTMLDivElement>(null)

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"

  useEffect(() => {
    fetchProducts()
    addTerminalLine("system", "CATALOG-MANAGER v3.0.0 initialized...")
    addTerminalLine("system", "Loading product catalog database...")
  }, [])

  useEffect(() => {
    const filtered = products.filter(
      (product) =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    setFilteredProducts(filtered)
  }, [products, searchTerm])

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [terminalLines])

  const addTerminalLine = (type: TerminalLine["type"], content: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setTerminalLines((prev) => [...prev, { type, content, timestamp }])
  }

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${baseUrl}/api/products`)
      const data = await response.json()
      setProducts(data)
      addTerminalLine("success", `Loaded ${data.length} products from catalog database`)
    } catch (error) {
      addTerminalLine("error", "Failed to connect to catalog database")
      toast.error("CONNECTION ERROR", {
        description: "Failed to load product catalog",
        style: {
          background: "#000000",
          border: "1px solid #6B7280",
          color: "#FFFFFF",
        },
      })
    }
  }

  const handleAuth = async (formData: FormData) => {
    setIsLoading(true)
    const username = formData.get("username") as string
    const password = formData.get("password") as string

    addTerminalLine("command", `auth --${authMode} --user=${username}`)

    try {
      const response = await fetch(`${baseUrl}/api/auth/${authMode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })

      const data = await response.json()

      if (response.ok) {
        if (authMode === "login") {
          setUser({ username, token: data.token })
          addTerminalLine("success", `User ${username} authenticated successfully`)
          addTerminalLine("system", "Catalog management privileges granted")
          toast.success("ACCESS GRANTED", {
            description: `Welcome back, ${username}`,
            style: {
              background: "#000000",
              border: "1px solid #6B7280",
              color: "#FFFFFF",
            },
          })
        } else {
          addTerminalLine("success", `User ${username} registered successfully`)
          toast.success("ACCOUNT CREATED", {
            description: "Please authenticate with your new credentials",
            style: {
              background: "#000000",
              border: "1px solid #6B7280",
              color: "#FFFFFF",
            },
          })
          setAuthMode("login")
        }
        setShowAuthDialog(false)
      } else {
        addTerminalLine("error", `Authentication failed: ${data.message}`)
        toast.error("ACCESS DENIED", {
          description: data.message || "Authentication failed",
          style: {
            background: "#000000",
            border: "1px solid #6B7280",
            color: "#FFFFFF",
          },
        })
      }
    } catch (error) {
      addTerminalLine("error", "Network connection failed")
      toast.error("CONNECTION ERROR", {
        description: "Network error occurred",
        style: {
          background: "#000000",
          border: "1px solid #6B7280",
          color: "#FFFFFF",
        },
      })
    } finally {
      setIsLoading(false)
    }
  }

  const toggleProductSelection = (productId: string) => {
    setSelectedProducts((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(productId)) {
        newSet.delete(productId)
        addTerminalLine("command", `select --remove --id=${productId}`)
      } else {
        newSet.add(productId)
        addTerminalLine("command", `select --add --id=${productId}`)
      }
      return newSet
    })
  }

  const handleProductSubmit = async (formData: FormData) => {
    if (!user) return

    setIsLoading(true)
    const productData = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      price: Number(formData.get("price")),
      images: (formData.get("images") as string)
        .split(",")
        .map((img) => img.trim())
        .filter(Boolean),
    }

    addTerminalLine("command", `catalog --add-product --name="${productData.name}"`)

    try {
      const response = await fetch(`${baseUrl}/api/products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify(productData),
      })

      if (response.ok) {
        addTerminalLine("success", `Product "${productData.name}" added to catalog`)
        toast.success("PRODUCT ADDED", {
          description: `${productData.name} added to catalog`,
          style: {
            background: "#000000",
            border: "1px solid #6B7280",
            color: "#FFFFFF",
          },
        })
        fetchProducts()
        setShowAddDialog(false)
      } else {
        addTerminalLine("error", "Failed to add product to catalog")
        toast.error("ERROR", {
          description: "Failed to add product",
          style: {
            background: "#000000",
            border: "1px solid #6B7280",
            color: "#FFFFFF",
          },
        })
      }
    } catch (error) {
      addTerminalLine("error", "Database connection failed")
      toast.error("CONNECTION ERROR", {
        description: "Network error occurred",
        style: {
          background: "#000000",
          border: "1px solid #6B7280",
          color: "#FFFFFF",
        },
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleProductUpdate = async (formData: FormData) => {
    if (!user || !editingProduct) return

    setIsLoading(true)
    const productData = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      price: Number(formData.get("price")),
      images: (formData.get("images") as string)
        .split(",")
        .map((img) => img.trim())
        .filter(Boolean),
    }

    addTerminalLine("command", `catalog --update-product --id=${editingProduct._id}`)

    try {
      const response = await fetch(`${baseUrl}/api/products/${editingProduct._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify(productData),
      })

      if (response.ok) {
        addTerminalLine("success", `Product "${productData.name}" updated in catalog`)
        toast.success("PRODUCT UPDATED", {
          description: `${productData.name} updated successfully`,
          style: {
            background: "#000000",
            border: "1px solid #6B7280",
            color: "#FFFFFF",
          },
        })
        fetchProducts()
        setShowEditDialog(false)
        setEditingProduct(null)
      } else {
        addTerminalLine("error", "Failed to update product")
        toast.error("ERROR", {
          description: "Failed to update product",
          style: {
            background: "#000000",
            border: "1px solid #6B7280",
            color: "#FFFFFF",
          },
        })
      }
    } catch (error) {
      addTerminalLine("error", "Database connection failed")
      toast.error("CONNECTION ERROR", {
        description: "Network error occurred",
        style: {
          background: "#000000",
          border: "1px solid #6B7280",
          color: "#FFFFFF",
        },
      })
    } finally {
      setIsLoading(false)
    }
  }

  const deleteProduct = async (productId: string) => {
    if (!user) return

    const product = products.find((p) => p._id === productId)
    addTerminalLine("command", `catalog --delete --id=${productId}`)

    try {
      const response = await fetch(`${baseUrl}/api/products/${productId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      })

      if (response.ok) {
        addTerminalLine("success", `Product "${product?.name}" removed from catalog`)
        toast.success("PRODUCT DELETED", {
          description: `${product?.name} removed from catalog`,
          style: {
            background: "#000000",
            border: "1px solid #6B7280",
            color: "#FFFFFF",
          },
        })
        fetchProducts()
      } else {
        addTerminalLine("error", "Failed to delete product")
        toast.error("ERROR", {
          description: "Failed to delete product",
          style: {
            background: "#000000",
            border: "1px solid #6B7280",
            color: "#FFFFFF",
          },
        })
      }
    } catch (error) {
      addTerminalLine("error", "Database connection failed")
      toast.error("CONNECTION ERROR", {
        description: "Network error occurred",
        style: {
          background: "#000000",
          border: "1px solid #6B7280",
          color: "#FFFFFF",
        },
      })
    }
  }

  const bulkDeleteSelected = async () => {
    if (!user || selectedProducts.size === 0) return

    addTerminalLine("command", `catalog --bulk-delete --count=${selectedProducts.size}`)

    for (const productId of selectedProducts) {
      await deleteProduct(productId)
    }

    setSelectedProducts(new Set())
    toast.success("BULK DELETE COMPLETED", {
      description: `${selectedProducts.size} products removed from catalog`,
      style: {
        background: "#000000",
        border: "1px solid #6B7280",
        color: "#FFFFFF",
      },
    })
  }

  return (
    <div className="min-h-screen bg-black text-white font-mono">
      {/* Terminal Header */}
      <div className="border-b border-gray-500 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Terminal className="h-6 w-6 text-gray-400" />
              <div>
                <pre className="text-white text-sm leading-tight">
                  {`
 ██████╗ █████╗ ████████╗ █████╗ ██╗      ██████╗  ██████╗       ███╗   ███╗ ██████╗ ██████╗ 
██╔════╝██╔══██╗╚══██╔══╝██╔══██╗██║     ██╔═══██╗██╔════╝       ████╗ ████║██╔════╝ ██╔══██╗
██║     ███████║   ██║   ███████║██║     ██║   ██║██║  ███╗█████╗██╔████╔██║██║  ███╗██████╔╝
██║     ██╔══██║   ██║   ██╔══██║██║     ██║   ██║██║   ██║╚════╝██║╚██╔╝██║██║   ██║██╔══██╗
╚██████╗██║  ██║   ██║   ██║  ██║███████╗╚██████╔╝╚██████╔╝      ██║ ╚═╝ ██║╚██████╔╝██║  ██║
 ╚═════╝╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝╚══════╝ ╚═════╝  ╚═════╝       ╚═╝     ╚═╝ ╚═════╝ ╚═╝  ╚═╝
                  `}
                </pre>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <span className="text-gray-400">STATUS:</span>
              <span className={user ? "text-white" : "text-gray-500"}>
                {user ? `AUTHENTICATED [${user.username}]` : "GUEST"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Terminal Output */}
          <div className="lg:col-span-1">
            <div className="bg-gray-900 border border-gray-500 rounded">
              <div className="bg-gray-600 text-black px-3 py-1 text-sm font-bold">SYSTEM LOG</div>
              <div
                ref={terminalRef}
                className="p-4 h-64 overflow-y-auto text-xs space-y-1 bg-black border border-gray-500"
              >
                {terminalLines.map((line, index) => (
                  <div key={index} className="flex">
                    <span className="text-gray-500 mr-2">[{line.timestamp}]</span>
                    <span
                      className={
                        line.type === "error"
                          ? "text-gray-400"
                          : line.type === "success"
                            ? "text-white"
                            : line.type === "command"
                              ? "text-gray-300"
                              : "text-gray-400"
                      }
                    >
                      {line.type === "command" && "$ "}
                      {line.content}
                    </span>
                  </div>
                ))}
                {isLoading && <div className="text-gray-300 animate-pulse">{">"} Processing...</div>}
              </div>
            </div>

            {/* Navigation */}
            <div className="mt-4 space-y-2">
              <Button
                onClick={() => setCurrentView("catalog")}
                variant={currentView === "catalog" ? "default" : "outline"}
                className="w-full bg-white hover:bg-gray-200 text-black font-mono border-gray-500"
              >
                <Database className="h-4 w-4 mr-2" />
                VIEW CATALOG
              </Button>
              <Button
                onClick={() => setCurrentView("analytics")}
                variant={currentView === "analytics" ? "default" : "outline"}
                className="w-full bg-transparent border-gray-500 text-white hover:bg-gray-800 font-mono"
              >
                <Archive className="h-4 w-4 mr-2" />
                ANALYTICS [{products.length}]
              </Button>
              {user ? (
                <div className="space-y-2">
                  <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full bg-transparent border-gray-500 text-white hover:bg-gray-800 font-mono"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        ADD PRODUCT
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-black border-gray-500 text-white">
                      <DialogHeader>
                        <DialogTitle className="text-white font-mono">ADD NEW PRODUCT</DialogTitle>
                      </DialogHeader>
                      <form action={handleProductSubmit} className="space-y-4">
                        <div>
                          <Label htmlFor="name" className="text-white font-mono">
                            PRODUCT NAME:
                          </Label>
                          <Input
                            id="name"
                            name="name"
                            required
                            className="bg-black border-gray-500 text-white font-mono"
                          />
                        </div>
                        <div>
                          <Label htmlFor="description" className="text-white font-mono">
                            DESCRIPTION:
                          </Label>
                          <Textarea
                            id="description"
                            name="description"
                            required
                            className="bg-black border-gray-500 text-white font-mono"
                          />
                        </div>
                        <div>
                          <Label htmlFor="price" className="text-white font-mono">
                            PRICE:
                          </Label>
                          <Input
                            id="price"
                            name="price"
                            type="number"
                            step="0.01"
                            required
                            className="bg-black border-gray-500 text-white font-mono"
                          />
                        </div>
                        <div>
                          <Label htmlFor="images" className="text-white font-mono">
                            IMAGE URLS (comma separated):
                          </Label>
                          <Input
                            id="images"
                            name="images"
                            placeholder="https://example.com/image1.jpg, https://example.com/image2.jpg"
                            className="bg-black border-gray-500 text-white font-mono"
                          />
                        </div>
                        <Button
                          type="submit"
                          disabled={isLoading}
                          className="w-full bg-white hover:bg-gray-200 text-black font-mono font-bold"
                        >
                          {isLoading ? "ADDING..." : "ADD TO CATALOG"}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                  <Button
                    onClick={() => {
                      setUser(null)
                      addTerminalLine("system", "User logged out")
                      toast.info("LOGGED OUT", {
                        description: "Session terminated",
                        style: {
                          background: "#000000",
                          border: "1px solid #6B7280",
                          color: "#FFFFFF",
                        },
                      })
                    }}
                    variant="outline"
                    className="w-full bg-transparent border-gray-600 text-gray-400 hover:bg-gray-800 font-mono"
                  >
                    LOGOUT
                  </Button>
                </div>
              ) : (
                <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full bg-transparent border-gray-500 hover:text-white text-white hover:bg-gray-800 font-mono"
                    >
                      <User className="h-4 w-4 mr-2" />
                      AUTHENTICATE
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-black border-gray-500 text-white">
                    <DialogHeader>
                      <DialogTitle className="text-white font-mono">
                        {authMode === "login" ? "USER AUTHENTICATION" : "CREATE ACCOUNT"}
                      </DialogTitle>
                    </DialogHeader>
                    <Tabs value={authMode} onValueChange={(value) => setAuthMode(value as "login" | "register")}>
                      <TabsList className="grid w-full grid-cols-2 bg-gray-900">
                        <TabsTrigger value="login" className="font-mono">
                          LOGIN
                        </TabsTrigger>
                        <TabsTrigger value="register" className="font-mono">
                          REGISTER
                        </TabsTrigger>
                      </TabsList>
                      <TabsContent value="login">
                        <form action={handleAuth} className="space-y-4">
                          <div>
                            <Label htmlFor="username" className="text-white font-mono">
                              USERNAME:
                            </Label>
                            <Input
                              id="username"
                              name="username"
                              required
                              className="bg-black border-gray-500 text-white font-mono"
                            />
                          </div>
                          <div>
                            <Label htmlFor="password" className="text-white font-mono">
                              PASSWORD:
                            </Label>
                            <Input
                              id="password"
                              name="password"
                              type="password"
                              required
                              className="bg-black border-gray-500 text-white font-mono"
                            />
                          </div>
                          <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-white hover:bg-gray-200 text-black font-mono"
                          >
                            {isLoading ? "AUTHENTICATING..." : "LOGIN"}
                          </Button>
                        </form>
                      </TabsContent>
                      <TabsContent value="register">
                        <form action={handleAuth} className="space-y-4">
                          <div>
                            <Label htmlFor="reg-username" className="text-white font-mono">
                              USERNAME:
                            </Label>
                            <Input
                              id="reg-username"
                              name="username"
                              required
                              className="bg-black border-gray-500 text-white font-mono"
                            />
                          </div>
                          <div>
                            <Label htmlFor="reg-password" className="text-white font-mono">
                              PASSWORD:
                            </Label>
                            <Input
                              id="reg-password"
                              name="password"
                              type="password"
                              required
                              className="bg-black border-gray-500 text-white font-mono"
                            />
                          </div>
                          <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-white hover:bg-gray-200 text-black font-mono"
                          >
                            {isLoading ? "CREATING..." : "REGISTER"}
                          </Button>
                        </form>
                      </TabsContent>
                    </Tabs>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            {currentView === "catalog" && (
              <div>
                {/* Search */}
                <div className="mb-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      type="text"
                      placeholder="search catalog..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value)
                        addTerminalLine("command", `search --query="${e.target.value}"`)
                      }}
                      className="pl-10 bg-black border-gray-500 text-white font-mono placeholder-gray-500"
                    />
                  </div>
                </div>

                {/* Products */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-white font-mono text-lg">CATALOG ENTRIES: [{filteredProducts.length}]</h3>
                  </div>

                  {filteredProducts.length === 0 ? (
                    <div className="text-center py-12 border border-gray-500 bg-gray-900">
                      <p className="text-gray-400 font-mono">NO PRODUCTS IN CATALOG</p>
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-4">
                      {filteredProducts.map((product) => (
                        <Card key={product._id} className="bg-gray-900 border-gray-500 hover:border-gray-400">
                          <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2">
                                  
                                  <h4 className="text-white font-mono font-bold text-lg">{product.name}</h4>
                                </div>
                                <p className="text-gray-300 text-sm mt-1 font-mono">{product.description}</p>
                              </div>
                              {product.images && product.images.length > 0 && (
                                <div className="w-20 h-20 ml-4 border border-gray-500 overflow-hidden">
                                  <img
                                    src={product.images[0] || "/placeholder.svg"}
                                    alt={product.name}
                                    className="w-full h-full object-cover grayscale"
                                  />
                                </div>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="space-y-3">
                              <div className="text-white font-mono font-bold text-xl">${product.price.toFixed(2)}</div>

                              <div className="flex space-x-2">
                                <Button
                                  onClick={() => setSelectedProduct(product)}
                                  size="sm"
                                  className="bg-white hover:bg-gray-200 text-black font-mono flex-1"
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  VIEW
                                </Button>
                                {user && (
                                  <>
                                    <Button
                                      onClick={() => {
                                        setEditingProduct(product)
                                        setShowEditDialog(true)
                                      }}
                                      size="sm"
                                      variant="outline"
                                      className="border-gray-500 text-gray-800 hover:text-white hover:bg-gray-800 font-mono"
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      onClick={() => deleteProduct(product._id)}
                                      size="sm"
                                      variant="outline"
                                      className="border-gray-600 text-gray-800 hover:text-white hover:bg-gray-800"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {currentView === "manage" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-white font-mono text-lg border-b border-gray-500 pb-2">
                    CATALOG MANAGEMENT [{selectedProducts.size} SELECTED]
                  </h3>
                  {selectedProducts.size > 0 && user && (
                    <Button
                      onClick={bulkDeleteSelected}
                      variant="outline"
                      className="border-gray-600 text-gray-400 hover:bg-gray-800 font-mono bg-transparent"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      DELETE SELECTED
                    </Button>
                  )}
                </div>
                <div className="text-center py-12 border border-gray-500 bg-gray-900">
                  <p className="text-gray-400 font-mono mb-4">BULK OPERATIONS PANEL</p>
                  <p className="text-gray-500 font-mono text-sm">
                    Select products from the catalog view to perform bulk operations
                  </p>
                </div>
              </div>
            )}

            {currentView === "analytics" && (
              <div className="space-y-4">
                <h3 className="text-white font-mono text-lg border-b border-gray-500 pb-2">CATALOG ANALYTICS</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <Card className="bg-gray-900 border-gray-500">
                    <CardContent className="p-4">
                      <h4 className="text-white font-mono font-bold mb-2">TOTAL PRODUCTS</h4>
                      <div className="text-white font-mono text-3xl">{products.length}</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gray-900 border-gray-500">
                    <CardContent className="p-4">
                      <h4 className="text-white font-mono font-bold mb-2">AVERAGE PRICE</h4>
                      <div className="text-white font-mono text-3xl">
                        $
                        {products.length > 0
                          ? (products.reduce((sum, p) => sum + p.price, 0) / products.length).toFixed(2)
                          : "0.00"}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Product Detail Modal */}
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent className="max-w-4xl bg-black border-gray-500 text-white">
          {selectedProduct && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="text-white font-mono text-xl">{selectedProduct.name}</DialogTitle>
              </DialogHeader>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  {selectedProduct.images && selectedProduct.images.length > 0 && (
                    <div className="aspect-square border border-gray-500 overflow-hidden bg-gray-900">
                      <img
                        src={selectedProduct.images[0] || "/placeholder.svg"}
                        alt={selectedProduct.name}
                        className="w-full h-full object-cover grayscale"
                      />
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-white font-mono font-bold mb-2">DESCRIPTION:</h4>
                    <p className="text-gray-300 font-mono">{selectedProduct.description}</p>
                  </div>
                  <div>
                    <h4 className="text-white font-mono font-bold mb-2">PRICE:</h4>
                    <div className="text-white font-mono text-2xl font-bold">${selectedProduct.price.toFixed(2)}</div>
                  </div>
                  <div>
                    <h4 className="text-white font-mono font-bold mb-2">PRODUCT ID:</h4>
                    <div className="text-gray-400 font-mono text-sm">{selectedProduct._id}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Product Modal */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="bg-black border-gray-500 text-white">
          {editingProduct && (
            <>
              <DialogHeader>
                <DialogTitle className="text-white font-mono">EDIT PRODUCT</DialogTitle>
              </DialogHeader>
              <form action={handleProductUpdate} className="space-y-4">
                <div>
                  <Label htmlFor="edit-name" className="text-white font-mono">
                    PRODUCT NAME:
                  </Label>
                  <Input
                    id="edit-name"
                    name="name"
                    defaultValue={editingProduct.name}
                    required
                    className="bg-black border-gray-500 text-white font-mono"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-description" className="text-white font-mono">
                    DESCRIPTION:
                  </Label>
                  <Textarea
                    id="edit-description"
                    name="description"
                    defaultValue={editingProduct.description}
                    required
                    className="bg-black border-gray-500 text-white font-mono"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-price" className="text-white font-mono">
                    PRICE:
                  </Label>
                  <Input
                    id="edit-price"
                    name="price"
                    type="number"
                    step="0.01"
                    defaultValue={editingProduct.price}
                    required
                    className="bg-black border-gray-500 text-white font-mono"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-images" className="text-white font-mono">
                    IMAGE URLS (comma separated):
                  </Label>
                  <Input
                    id="edit-images"
                    name="images"
                    defaultValue={editingProduct.images?.join(", ")}
                    className="bg-black border-gray-500 text-white font-mono"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-white hover:bg-gray-200 text-black font-mono font-bold"
                >
                  {isLoading ? "UPDATING..." : "UPDATE PRODUCT"}
                </Button>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="border-t border-gray-500 bg-gray-900 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">
            <pre className="text-white text-xs">
              {`
┌─────────────────────────────────────────────────────────────┐
│                 CATALOG-MANAGER v3.0.0                     │
│            Product Catalog Management System                │
│                                                             │
│  © 2024 CatalogSys Industries. All rights reserved.        │
│  Powered by advanced database management technology         │
└─────────────────────────────────────────────────────────────┘
              `}
            </pre>
          </div>
        </div>
      </footer>
    </div>
  )
}
