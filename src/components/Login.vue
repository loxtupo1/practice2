<template>
  <div class="auth-container">
    <div class="auth-card">
      <h2 class="auth-title">ВХОД В СИСТЕМУ</h2>
      <p class="auth-subtitle">Доступ к управлению турнирами</p>
      
      <form @submit.prevent="handleLogin" class="auth-form">
        <div class="form-group">
          <input 
            v-model="email" 
            type="email" 
            placeholder="Email"
            required
          />
        </div>
        
        <div class="form-group">
          <input 
            v-model="password" 
            type="password" 
            placeholder="Пароль"
            required
          />
        </div>
        
        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>
        
        <button 
          type="submit" 
          class="btn-submit" 
          :disabled="loading"
        >
          {{ loading ? 'ВХОД...' : 'ВОЙТИ' }}
        </button>
      </form>
      
      <p class="auth-footer">
        Нет аккаунта? 
        <router-link to="/register">Зарегистрироваться</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { useRouter } from "vue-router";

const router = useRouter();
const email = ref("");
const password = ref("");
const loading = ref(false);
const errorMessage = ref("");

const handleLogin = async () => {
  errorMessage.value = "";
  
  if (!email.value || !password.value) {
    errorMessage.value = "Пожалуйста, заполните все поля";
    return;
  }
  
  loading.value = true;
  
  try {
    await signInWithEmailAndPassword(auth, email.value, password.value);
    router.push("/");
  } catch (error) {
    switch (error.code) {
      case 'auth/invalid-credential':
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        errorMessage.value = "Неверный email или пароль";
        break;
      case 'auth/invalid-email':
        errorMessage.value = "Некорректный email адрес";
        break;
      default:
        errorMessage.value = "Ошибка при входе. Попробуйте позже";
    }
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.auth-container {
  min-height: calc(100vh - 140px);
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0a0c0f;
  padding: 2rem;
}

.auth-card {
  background: #14181c;
  border: 1px solid #2a2e32;
  padding: 3rem;
  width: 100%;
  max-width: 400px;
  position: relative;
  overflow: hidden;
}

.auth-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background: #00ffff;
  transform: scaleY(0);
  transition: transform 0.3s ease;
}

.auth-card:hover::before {
  transform: scaleY(1);
}

.auth-title {
  color: #00ffff;
  font-size: 2rem;
  font-weight: 900;
  letter-spacing: 0.2rem;
  margin-bottom: 0.5rem;
  text-align: center;
}

.auth-subtitle {
  color: #808080;
  text-align: center;
  margin-bottom: 2rem;
  font-size: 0.9rem;
  letter-spacing: 0.1rem;
}

.auth-form {
  margin-bottom: 2rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group input {
  width: 100%;
  padding: 1rem;
  background: #0a0c0f;
  border: 1px solid #2a2e32;
  color: #e0e0e0;
  font-size: 1rem;
  transition: all 0.3s ease;
  border-radius: 4px;
}

.form-group input:focus {
  outline: none;
  border-color: #00ffff;
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.1);
}

.form-group input::placeholder {
  color: #4a4e52;
}

.error-message {
  background: rgba(255, 68, 68, 0.1);
  border: 1px solid #ff4444;
  color: #ff4444;
  padding: 0.8rem;
  margin-bottom: 1rem;
  text-align: center;
  border-radius: 4px;
  font-size: 0.9rem;
}

.btn-submit {
  width: 100%;
  padding: 1rem;
  background: #00ffff;
  color: #0a0c0f;
  border: 2px solid #00ffff;
  font-weight: 600;
  letter-spacing: 0.1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: 4px;
  font-size: 1rem;
}

.btn-submit:hover:not(:disabled) {
  background: transparent;
  color: #00ffff;
}

.btn-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.auth-footer {
  text-align: center;
  color: #808080;
  font-size: 0.9rem;
}

.auth-footer a {
  color: #00ffff;
  text-decoration: none;
  font-weight: 600;
  margin-left: 0.5rem;
  transition: all 0.3s ease;
}

.auth-footer a:hover {
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
}

@media (max-width: 480px) {
  .auth-card {
    padding: 2rem;
  }

  .auth-title {
    font-size: 1.5rem;
  }

  .auth-form {
    gap: 1rem;
  }

  .auth-input {
    padding: 0.8rem;
    font-size: 0.9rem;
  }

  .auth-btn {
    padding: 0.8rem;
    font-size: 0.9rem;
  }

  .auth-footer {
    font-size: 0.9rem;
  }
}

@media (max-width: 360px) {
  .auth-container {
    padding: 1rem;
  }

  .auth-card {
    padding: 1.5rem;
  }

  .auth-title {
    font-size: 1.3rem;
  }

  .auth-input {
    padding: 0.7rem;
    font-size: 0.8rem;
  }

  .auth-btn {
    padding: 0.7rem;
    font-size: 0.8rem;
  }
}
</style>