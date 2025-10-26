import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, Animated, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

export default function NotificationsModal({ visible, onClose }) {
  const [notifAnim] = useState(new Animated.Value(0));
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  useEffect(() => {
    if (visible) {
      Animated.timing(notifAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
      // Fetch first page
      fetchPage(1);
    }
  }, [visible]);

  // page-based fetching state
  const [page, setPage] = useState(1);
  const [nextUrl, setNextUrl] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [prevUrl, setPrevUrl] = useState(null);
  const [totalCount, setTotalCount] = useState(null);
  const pageSize = 3; // mostrar 3 notificaciones por página

  const fetchPage = async (pageToFetch = 1) => {
    try {
      if (pageToFetch === 1) setLoadingNotifications(true);
      else setLoadingMore(true);

      const token = await AsyncStorage.getItem('accessToken');
      const isEmpresaAccount = await AsyncStorage.getItem('isEmpresaAccount');

      let res;

      if (!isEmpresaAccount) {
        res = await api.get(`/api/notificaciones/`, {
          params: { page: pageToFetch, page_size: pageSize },
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
      } else {
        const empresaId = await AsyncStorage.getItem('empresaId');
        res = await api.get(`/api/empresas/${empresaId}/notificaciones/`, {
          params: { page: pageToFetch, page_size: pageSize },
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
      }

      
      

      // Normalize list: either array or paginated { results: [], next: 'url' }
      const items = Array.isArray(res.data)
        ? res.data
        : (Array.isArray(res?.data?.results) ? res.data.results : []);
      // Guardar sólo hasta pageSize elementos (en caso de que el backend devuelva más)
      const pageItems = Array.isArray(items) ? items.slice(0, pageSize) : [];
      setNotifications(prev => (pageToFetch === 1 ? pageItems : pageItems));
      setPage(pageToFetch);
      setNextUrl(res?.data?.next || null);
      setPrevUrl(res?.data?.previous || null);
      setTotalCount(res?.data?.count ?? null);
    } catch (e) {
      console.log('NotificationsModal: error fetching page', e);
      if (pageToFetch === 1) setNotifications([]);
    } finally {
      setLoadingNotifications(false);
      setLoadingMore(false);
    }
  };

  const handleCloseAll = () => {
    Animated.timing(notifAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => onClose && onClose());
  };

  const handleDismissNotification = async (n) => {
    setNotifications((prev) => prev.filter(x => (x.id || x.pk) !== (n.id || n.pk)));
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (n.id) {
        await api.post(`/api/notificaciones/${n.id}/marcar-leida/`, {}, { headers: token ? { Authorization: `Bearer ${token}` } : undefined }).catch(() => {});
      }
    } catch (e) {
      // ignore
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Animated.View
        pointerEvents={visible ? 'auto' : 'none'}
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.9)', zIndex: 200,
          justifyContent: 'center', alignItems: 'center', opacity: notifAnim,
        }}
      >
        <View style={{ backgroundColor: '#1e293b', borderRadius: 24, padding: 28, minWidth: 300, maxWidth: '90%', shadowColor: '#000', shadowOpacity: 0.18, shadowOffset: { width: 0, height: 2 }, shadowRadius: 12, position: 'relative' }}>
          <TouchableOpacity onPress={handleCloseAll} style={{ position: 'absolute', top: 16, right: 16, zIndex: 10 }} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={{ fontSize: 28, color: '#fff', fontWeight: 'bold' }}>×</Text>
          </TouchableOpacity>
          <Text style={{ color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 18, textAlign: 'center' }}>Notificaciones</Text>

          {loadingNotifications ? (
            <View style={{ paddingVertical: 12, alignItems: 'center' }}>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={{ color: '#9ca3af', marginTop: 8 }}>Cargando notificaciones...</Text>
            </View>
          ) : notifications.length === 0 ? (
            <View style={{ paddingVertical: 12, alignItems: 'center' }}>
              <Text style={{ color: '#9ca3af' }}>No hay notificaciones nuevas</Text>
            </View>
          ) : (
            notifications.map((n) => {
              const title = n.titulo || n.title || n.asunto || (n.tipo === 'evento' ? 'Nuevo evento' : 'Notificación');
              const body = n.mensaje || n.mensaje_corto || n.body || n.descripcion || n.texto || n.text || '';
              const id = n.id || n.pk || `${n.tipo || 'n'}-${Math.random().toString(36).slice(2,8)}`;
              return (
                <View key={id} style={{ marginBottom: 12, backgroundColor: '#334155', borderRadius: 12, padding: 16 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>{title}</Text>
                      {body ? <Text style={{ color: '#dbeafe', marginTop: 6 }}>{body}</Text> : null}
                      {n.fecha || n.created_at || n.creado_en ? (
                        <Text style={{ color: '#94a3b8', marginTop: 8, fontSize: 12 }}>{new Date(n.fecha || n.created_at || n.creado_en).toLocaleString()}</Text>
                      ) : null}
                    </View>
                    <TouchableOpacity onPress={() => handleDismissNotification(n)} style={{ padding: 6 }}>
                      <Text style={{ color: '#ff007f', fontWeight: '600' }}>Cerrar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}

          {/* Navegación por páginas: flechas para atrás/adelante que reemplazan las notificaciones actuales */}
          <View style={{ marginTop: 8, alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <TouchableOpacity
                onPress={() => {
                  if (page > 1) fetchPage(page - 1);
                }}
                disabled={!prevUrl && page <= 1}
                style={{ padding: 8 }}
              >
                <Text style={{ color: page > 1 || prevUrl ? '#fff' : '#64748b', fontSize: 20 }}>{'‹'}</Text>
              </TouchableOpacity>

              <Text style={{ color: '#cbd5e1' }}>{totalCount ? `Página ${page} — ${Math.ceil(totalCount / pageSize)} ` : `Página ${page}`}</Text>

              <TouchableOpacity
                onPress={() => {
                  // avanzar sólo si hay siguiente
                  if (nextUrl) fetchPage(page + 1);
                }}
                disabled={!nextUrl}
                style={{ padding: 8 }}
              >
                <Text style={{ color: nextUrl ? '#fff' : '#64748b', fontSize: 20 }}>{'›'}</Text>
              </TouchableOpacity>
            </View>
          </View>

        </View>
      </Animated.View>
    </Modal>
  );
}
