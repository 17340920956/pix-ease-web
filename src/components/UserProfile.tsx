'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  LogOut,
  Settings,
  X,
  Check,
  Mail,
  Phone,
  FileText,
  ChevronDown,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useDropdown } from '@/hooks/useDropdown';

const springFast = { type: 'spring' as const, stiffness: 420, damping: 32, mass: 0.7 };

export default function UserProfile() {
  const { user, updateProfileAction, logout, isLoading, error, clearError } = useAuthStore();
  const { isOpen, toggle, close, ref } = useDropdown();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editForm, setEditForm] = useState({
    nickname: user?.nickname || user?.userName || '',
    bio: user?.bio || '',
    phone: user?.phone || '',
  });

  useEffect(() => {
    if (user) {
      setEditForm({
        nickname: user.nickname || user.userName || '',
        bio: user.bio || '',
        phone: user.phone || '',
      });
    }
  }, [user, showEditModal]);

  if (!user) return null;

  const displayName = user.nickname || user.userName || '用户';

  const handleSave = async () => {
    const { setError } = useAuthStore.getState();

    if (!editForm.nickname.trim()) {
      setError('昵称不能为空');
      return;
    }
    if (editForm.nickname.trim().length < 2 || editForm.nickname.trim().length > 32) {
      setError('昵称长度需要在2-32个字符之间');
      return;
    }
    if (editForm.bio && editForm.bio.length > 200) {
      setError('个人简介不能超过200个字符');
      return;
    }
    if (editForm.phone && !/^1[3-9]\d{9}$/.test(editForm.phone.trim())) {
      setError('请输入正确的手机号码');
      return;
    }

    setSaving(true);
    try {
      await updateProfileAction({
        nickname: editForm.nickname.trim() || undefined,
        bio: editForm.bio.trim() || undefined,
        phone: editForm.phone.trim() || undefined,
      });
      setShowEditModal(false);
    } catch {
      // 错误已在 store 中
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    const { deleteAccountAction } = useAuthStore.getState();
    try {
      await deleteAccountAction();
      setShowDeleteConfirm(false);
      window.location.href = '/';
    } catch {
      // 错误已在 store 中
    }
  };

  return (
    <>
      {/* 用户信息按钮 */}
      <div className="relative" ref={ref}>
        <motion.button
          onClick={toggle}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          transition={springFast}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors"
          style={{
            backgroundColor: 'var(--button-bg)',
            color: 'var(--text-primary)',
            border: '1px solid var(--input-border)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--button-hover-bg)';
          }}
          onMouseLeave={(e) => {
            if (!isOpen) {
              e.currentTarget.style.backgroundColor = 'var(--button-bg)';
            }
          }}
        >
          <User className="w-4 h-4" />
          <span className="hidden sm:inline max-w-[80px] truncate">
            {displayName}
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </motion.button>

        {/* 下拉菜单 */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-1 w-56 rounded-xl overflow-hidden z-50"
              style={{
                backgroundColor: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
              }}
            >
              {/* 用户信息头部 */}
              <div className="px-3 py-2.5" style={{ borderBottom: '1px solid var(--border-color)' }}>
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                  {displayName}
                </p>
                <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {user.email}
                </p>
              </div>

              {/* 菜单项 */}
              <div className="p-1">
                <motion.button
                  onClick={() => {
                    close();
                    setShowEditModal(true);
                  }}
                  whileHover={{ scale: 1.02, x: 2 }}
                  whileTap={{ scale: 0.97 }}
                  transition={springFast}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
                  style={{ color: 'var(--text-primary)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--button-bg)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <Settings className="w-4 h-4" />
                  个人设置
                </motion.button>

                <motion.button
                  onClick={() => {
                    close();
                    logout();
                  }}
                  whileHover={{ scale: 1.02, x: 2 }}
                  whileTap={{ scale: 0.97 }}
                  transition={springFast}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
                  style={{ color: 'var(--danger)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--button-bg)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <LogOut className="w-4 h-4" />
                  退出登录
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 编辑弹窗 - 无头像 */}
      <AnimatePresence>
        {showEditModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            onClick={() => setShowEditModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md rounded-2xl p-6 space-y-6"
              style={{
                backgroundColor: 'var(--card-bg)',
                backdropFilter: 'blur(20px)',
                border: '1px solid var(--glass-border)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* 弹窗头部 */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  个人设置
                </h3>
                <motion.button
                  onClick={() => setShowEditModal(false)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  transition={springFast}
                  className="p-2 rounded-lg transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--button-hover-bg)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; }}
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              {/* 表单字段 */}
              <div className="space-y-4">
                {/* 昵称 */}
                <div>
                  <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                    <User className="w-4 h-4" />
                    昵称
                  </label>
                  <input
                    type="text"
                    value={editForm.nickname}
                    onChange={(e) => setEditForm({ ...editForm, nickname: e.target.value })}
                    placeholder="设置你的昵称"
                    className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none transition-colors"
                    style={{
                      backgroundColor: 'var(--input-bg)',
                      border: '1px solid var(--input-border)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>

                {/* 邮箱（只读） */}
                <div>
                  <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                    <Mail className="w-4 h-4" />
                    邮箱
                  </label>
                  <input
                    type="email"
                    value={user.email}
                    disabled
                    className="w-full px-3 py-2.5 rounded-xl text-sm cursor-not-allowed"
                    style={{
                      backgroundColor: 'var(--button-bg)',
                      border: '1px solid var(--input-border)',
                      color: 'var(--text-muted)',
                    }}
                  />
                </div>

                {/* 手机号 */}
                <div>
                  <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                    <Phone className="w-4 h-4" />
                    手机号
                  </label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    placeholder="绑定手机号"
                    className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none transition-colors"
                    style={{
                      backgroundColor: 'var(--input-bg)',
                      border: '1px solid var(--input-border)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>

                {/* 个人简介 */}
                <div>
                  <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                    <FileText className="w-4 h-4" />
                    个人简介
                  </label>
                  <textarea
                    value={editForm.bio}
                    onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                    placeholder="介绍一下你自己..."
                    rows={3}
                    className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none resize-none transition-colors"
                    style={{
                      backgroundColor: 'var(--input-bg)',
                      border: '1px solid var(--input-border)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-3 pt-2">
                <motion.button
                  onClick={() => setShowEditModal(false)}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.96 }}
                  transition={springFast}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: 'var(--button-bg)',
                    color: 'var(--text-secondary)',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--button-hover-bg)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--button-bg)'; }}
                >
                  取消
                </motion.button>
                <motion.button
                  onClick={handleSave}
                  disabled={saving}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.94 }}
                  transition={springFast}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ backgroundColor: 'var(--primary)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.9'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  保存
                </motion.button>
              </div>

              {error && (
                <p className="text-xs text-center" style={{ color: 'var(--danger)' }}>{error}</p>
              )}

              {/* 删除账号 */}
              <div className="pt-2" style={{ borderTop: '1px solid var(--border-color)' }}>
                <motion.button
                  onClick={() => {
                    setShowEditModal(false);
                    setShowDeleteConfirm(true);
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  transition={springFast}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--danger)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                >
                  <Trash2 className="w-4 h-4" />
                  注销账号
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 删除确认弹窗 */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm rounded-2xl p-6 space-y-5"
              style={{
                backgroundColor: 'var(--card-bg)',
                border: '1px solid var(--glass-border)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255,77,79,0.1)' }}>
                  <AlertTriangle className="w-6 h-6" style={{ color: 'var(--danger)' }} />
                </div>
                <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                  确认注销账号
                </h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  注销后所有数据将被删除，此操作不可撤销。
                </p>
              </div>
              <div className="flex gap-3">
                <motion.button
                  onClick={() => setShowDeleteConfirm(false)}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.96 }}
                  transition={springFast}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: 'var(--button-bg)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  取消
                </motion.button>
                <motion.button
                  onClick={handleDeleteAccount}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.94 }}
                  transition={springFast}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-colors"
                  style={{ backgroundColor: 'var(--danger)' }}
                >
                  确认注销
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
