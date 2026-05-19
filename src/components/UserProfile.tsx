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
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useDropdown } from '@/hooks/useDropdown';

export default function UserProfile() {
  const { user, updateUser, logout } = useAuthStore();
  const { isOpen, toggle, close, ref } = useDropdown();
  const [showEditModal, setShowEditModal] = useState(false);

  const [editForm, setEditForm] = useState({
    nickname: user?.nickname || '',
    bio: user?.bio || '',
    phone: user?.phone || '',
  });

  useEffect(() => {
    if (user) {
      setEditForm({
        nickname: user.nickname || '',
        bio: user.bio || '',
        phone: user.phone || '',
      });
    }
  }, [user, showEditModal]);

  if (!user) return null;

  const displayName = user.nickname || user.username || '用户';

  const handleSave = () => {
    updateUser({
      nickname: editForm.nickname.trim() || undefined,
      bio: editForm.bio.trim() || undefined,
      phone: editForm.phone.trim() || undefined,
    });
    setShowEditModal(false);
  };

  return (
    <>
      {/* 用户信息按钮 */}
      <div className="relative" ref={ref}>
        <button
          onClick={toggle}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all"
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
        </button>

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
                <button
                  onClick={() => {
                    close();
                    setShowEditModal(true);
                  }}
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
                </button>

                <button
                  onClick={() => {
                    close();
                    logout();
                  }}
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
                </button>
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
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-2 rounded-lg transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--button-hover-bg)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; }}
                >
                  <X className="w-5 h-5" />
                </button>
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
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: 'var(--button-bg)',
                    color: 'var(--text-secondary)',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--button-hover-bg)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--button-bg)'; }}
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-colors flex items-center justify-center gap-2"
                  style={{ backgroundColor: 'var(--primary)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.9'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
                >
                  <Check className="w-4 h-4" />
                  保存
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
