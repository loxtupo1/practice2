import { createRouter, createWebHistory } from "vue-router";
import { auth } from "./firebase";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import Home from "./components/Home.vue";
import Login from "./components/Login.vue";
import Register from "./components/Register.vue";
import Profile from "./components/Profile.vue";
import Admin from "./components/Admin.vue";
import TournamentDetail from "./components/TournamentDetail.vue";

const routes = [
  { path: "/", component: Home, props: true },
  { path: "/login", component: Login },
  { path: "/register", component: Register },
  { path: "/tournament/:id", component: TournamentDetail, props: true },
  { path: "/profile", component: Profile, meta: { requiresAuth: true }, props: true },
  { path: "/admin", component: Admin, meta: { requiresAdmin: true }, props: true },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to, from, next) => {
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
  const requiresAdmin = to.matched.some(record => record.meta.requiresAdmin);

  if (requiresAuth || requiresAdmin) {
    await new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe();
        resolve(user);
      });
    });

    if (auth.currentUser) {
      if (requiresAdmin) {
        try {
          const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
          if (userDoc.exists() && userDoc.data().role === 'admin') {
            next();
          } else {
            alert('Доступ запрещен. Требуются права администратора.');
            next('/');
          }
        } catch (error) {
          console.error('Ошибка проверки прав:', error);
          next('/');
        }
      } else {
        next();
      }
    } else {
      next('/login');
    }
  } else {
    next();
  }
});

export default router;