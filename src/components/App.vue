<template>
  <div class="app-container">
    <nav class="navbar">
      <div class="nav-brand">
        <router-link to="/" class="brand-link">
          <span class="brand-name">CYBERTOUR</span>
        </router-link>
      </div>
      
      <div class="nav-menu">
        <router-link to="/" class="nav-link" active-class="active">Главная</router-link>
        
        <template v-if="isAuthenticated">
          <router-link to="/profile" class="nav-link" active-class="active">Профиль</router-link>
          <router-link v-if="isAdmin" to="/admin" class="nav-link admin-link" active-class="active">
            Админпанель
          </router-link>
          <div class="user-info">
            <span class="user-email">Привет, {{ userName }}</span>
            <button class="logout-btn" @click="handleLogout">Выйти</button>
          </div>
        </template>
        
        <template v-else>
          <router-link to="/login" class="nav-link" active-class="active">Вход</router-link>
          <router-link to="/register" class="nav-link" active-class="active">Регистрация</router-link>
        </template>
      </div>
    </nav>
    
    <main class="main-content">
      <router-view v-if="authIsReady" v-slot="{ Component }">
        <component
          :is="Component"
          :is-authenticated="isAuthenticated"
          :is-admin="isAdmin"
          :user-id="userId"
          :user-email="userEmail"
          :user-name="userName"
        />
      </router-view>
      <div v-else class="loading-overlay">Загрузка системы...</div>
    </main>
    
    <footer class="footer">
      <p>&copy; 2026 CYBERTOUR. Платформа киберспортивных турниров</p>
    </footer>
  </div>
</template>

<script setup>
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const isAuthenticated = ref(false);
const isAdmin = ref(false);
const authIsReady = ref(false);
const userEmail = ref("");
const userName = ref("");
const userId = ref("");

onAuthStateChanged(auth, async (user) => {
  if (user) {
    isAuthenticated.value = true;
    userEmail.value = user.email;
    userId.value = user.uid;
    
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        userName.value = userData.displayName || user.email.split('@')[0];
        isAdmin.value = userData.role === 'admin';
      }
    } catch (error) {
      console.error("Ошибка профиля:", error);
    }
  } else {
    isAuthenticated.value = false;
    isAdmin.value = false;
    userEmail.value = "";
    userName.value = "";
  }
  authIsReady.value = true;
});

const handleLogout = async () => {
  try {
    await signOut(auth);
    router.push("/");
  } catch (error) {
    console.error("Ошибка выхода:", error);
  }
};
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  background-color: #0a0c0f;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
}

.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #0a0c0f;
}

.navbar {
  background: rgba(10, 12, 15, 0.95);
  backdrop-filter: blur(10px);
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #2a2e32;
  position: sticky;
  top: 0;
  z-index: 1000;
}

.nav-brand .brand-link {
  text-decoration: none;
  font-size: 1.5rem;
  font-weight: bold;
  color: #00ffff;
  letter-spacing: 0.2rem;
}

.nav-menu {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.nav-link {
  padding: 0.5rem 1rem;
  text-decoration: none;
  color: #808080;
  transition: all 0.3s ease;
}

.nav-link:hover {
  color: #00ffff;
}

.nav-link.active {
  color: #00ffff;
  border-bottom: 2px solid #00ffff;
}

.admin-link {
  color: #ffa500;
  font-weight: 600;
}

.admin-link:hover {
  color: #ffb81c;
}

.admin-link.active {
  color: #ffb81c;
  border-bottom: 2px solid #ffb81c;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-left: 1rem;
  padding-left: 1rem;
  border-left: 1px solid #2a2e32;
}

.user-email {
  color: #00ffff;
  font-weight: 500;
}

.logout-btn {
  padding: 0.5rem 1rem;
  background: transparent;
  border: 1px solid #ff4444;
  color: #ff4444;
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: 4px;
}

.logout-btn:hover {
  background: #ff4444;
  color: white;
}

.main-content {
  flex: 1;
  width: 100%;
  margin: 0 auto;
}

.footer {
  background: #0f1215;
  padding: 1.5rem;
  text-align: center;
  color: #808080;
  border-top: 1px solid #2a2e32;
}

@media (max-width: 768px) {
  .navbar {
    padding: 1rem;
    flex-wrap: wrap;
  }

  .nav-brand .brand-link {
    font-size: 1.2rem;
  }

  .nav-menu {
    flex-wrap: wrap;
    gap: 0.5rem;
    width: 100%;
    margin-top: 1rem;
  }

  .user-info {
    margin-left: 0;
    padding-left: 0;
    border-left: none;
    flex-direction: column;
    gap: 0.5rem;
    align-items: flex-start;
  }

  .user-email {
    font-size: 0.9rem;
  }

  .main-content {
    padding: 0 1rem;
  }

  .footer {
    padding: 1rem;
    font-size: 0.9rem;
  }
}

@media (max-width: 480px) {
  .navbar {
    padding: 0.5rem;
  }

  .nav-brand .brand-link {
    font-size: 1rem;
  }

  .nav-menu {
    justify-content: center;
  }

  .nav-link {
    padding: 0.4rem 0.8rem;
    font-size: 0.9rem;
  }

  .user-info {
    align-items: center;
  }

  .logout-btn {
    padding: 0.4rem 0.8rem;
    font-size: 0.9rem;
  }
}
</style>