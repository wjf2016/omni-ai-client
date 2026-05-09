// IndexedDB 封装
const DB_NAME = 'omni-ai-db'
const DB_VERSION = 1

let db = null

export const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      db = request.result
      resolve(db)
    }

    request.onupgradeneeded = (event) => {
      const database = event.target.result

      // 会话存储
      if (!database.objectStoreNames.contains('conversations')) {
        const conversationStore = database.createObjectStore('conversations', { keyPath: 'id' })
        conversationStore.createIndex('updatedAt', 'updatedAt', { unique: false })
      }

      // 配置存储
      if (!database.objectStoreNames.contains('settings')) {
        database.createObjectStore('settings', { keyPath: 'key' })
      }
    }
  })
}

// 会话操作
export const saveConversation = async (conversation) => {
  if (!db) {
    throw new Error('Database not initialized')
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['conversations'], 'readwrite')
    const store = tx.objectStore('conversations')
    const request = store.put(conversation)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export const getConversations = async () => {
  if (!db) {
    throw new Error('Database not initialized')
  }
  const tx = db.transaction(['conversations'], 'readonly')
  const store = tx.objectStore('conversations')
  const index = store.index('updatedAt')
  return new Promise((resolve, reject) => {
    const request = index.openCursor(null, 'prev')
    const results = []
    request.onsuccess = (e) => {
      const cursor = e.target.result
      if (cursor) {
        results.push(cursor.value)
        cursor.continue()
      } else {
        resolve(results)
      }
    }
    request.onerror = () => reject(request.error)
  })
}

export const deleteConversation = async (id) => {
  if (!db) {
    throw new Error('Database not initialized')
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['conversations'], 'readwrite')
    const store = tx.objectStore('conversations')
    const request = store.delete(id)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

// 配置操作
export const saveSetting = async (key, value) => {
  if (!db) {
    throw new Error('Database not initialized')
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['settings'], 'readwrite')
    const store = tx.objectStore('settings')
    const request = store.put({ key, value })

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export const getSetting = async (key) => {
  if (!db) {
    throw new Error('Database not initialized')
  }
  const tx = db.transaction(['settings'], 'readonly')
  const store = tx.objectStore('settings')
  return new Promise((resolve, reject) => {
    const request = store.get(key)
    request.onsuccess = () => resolve(request.result ? request.result.value : null)
    request.onerror = () => reject(request.error)
  })
}

export const getAllSettings = async () => {
  if (!db) {
    throw new Error('Database not initialized')
  }
  const tx = db.transaction(['settings'], 'readonly')
  const store = tx.objectStore('settings')
  return new Promise((resolve, reject) => {
    const request = store.getAll()
    request.onsuccess = () => {
      const settings = {}
      request.result.forEach(item => {
        settings[item.key] = item.value
      })
      resolve(settings)
    }
    request.onerror = () => reject(request.error)
  })
}
