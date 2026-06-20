import { useState } from 'react';
import { AlertTriangle, Phone, Mail, MessageSquare, Clock, User, BookOpen } from 'lucide-react';
import { useBorrowStore } from '../stores/borrowStore';
import { useBookStore } from '../stores/bookStore';
import { useReaderStore } from '../stores/readerStore';
import { useLibraryStore } from '../stores/libraryStore';
import { StatusBadge } from '../components/StatusBadge';
import { formatDate } from '../utils/date';
import { getOverdueDays } from '../utils/date';
import { Toast } from '../components/Toast';
import { Modal } from '../components/Modal';

export const Overdue = () => {
  const { getOverdueRecords, sendReminder, getReminderRecordsByBorrow } = useBorrowStore();
  const { getCopyById, getBookById } = useBookStore();
  const { getReaderById } = useReaderStore();
  const { getLibraryById } = useLibraryStore();

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'info'>('success');
  const [detailRecord, setDetailRecord] = useState<string | null>(null);
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [reminderMethod, setReminderMethod] = useState<'email' | 'phone' | 'sms'>('email');

  const overdueRecords = getOverdueRecords();

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const handleSendReminder = (recordId: string) => {
    setSelectedRecordId(recordId);
    setReminderModalOpen(true);
  };

  const confirmSendReminder = () => {
    if (!selectedRecordId) return;
    sendReminder(selectedRecordId, reminderMethod);
    showToast('催还通知已发送', 'success');
    setReminderModalOpen(false);
    setSelectedRecordId(null);
  };

  const totalOverdue = overdueRecords.length;
  const totalFine = overdueRecords.reduce((sum, r) => sum + r.fine, 0);
  const avgOverdueDays = totalOverdue > 0
    ? Math.round(overdueRecords.reduce((sum, r) => sum + getOverdueDays(r.dueDate), 0) / totalOverdue)
    : 0;

  const currentRecord = detailRecord ? getOverdueRecords().find(r => r.id === detailRecord) : null;
  const reminderRecords = detailRecord ? getReminderRecordsByBorrow(detailRecord) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">逾期催还</h1>
        <p className="text-gray-500 mt-1">管理逾期图书，发起催还通知</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
              <AlertTriangle size={20} className="text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">逾期总数</p>
              <p className="text-2xl font-bold text-red-600">{totalOverdue}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
              <Clock size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">平均逾期</p>
              <p className="text-2xl font-bold text-gray-900">{avgOverdueDays} 天</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
              <span className="text-orange-600 font-bold text-lg">¥</span>
            </div>
            <div>
              <p className="text-sm text-gray-500">累计罚款</p>
              <p className="text-2xl font-bold text-orange-600">¥{totalFine.toFixed(2)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <Mail size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">待催还</p>
              <p className="text-2xl font-bold text-gray-900">
                {overdueRecords.filter((r) => r.reminderCount === 0).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">逾期列表</h2>
        </div>
        <div className="overflow-x-auto">
          {overdueRecords.length === 0 ? (
            <div className="py-16 text-center">
              <AlertTriangle size={48} className="text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">暂无逾期记录</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    图书信息
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    读者
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    借出馆点
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    借出日期
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    应还日期
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    逾期天数
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    罚款
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    催还次数
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {overdueRecords.map((record) => {
                  const copy = getCopyById(record.copyId);
                  const book = copy ? getBookById(copy.bookId) : null;
                  const reader = getReaderById(record.readerId);
                  const library = getLibraryById(record.borrowLibraryId);
                  const overdueDays = getOverdueDays(record.dueDate);

                  return (
                    <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-14 bg-gray-100 rounded flex items-center justify-center">
                            <BookOpen size={18} className="text-gray-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {book?.title}
                            </p>
                            <p className="text-xs text-gray-500">{copy?.barcode}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center">
                            <User size={14} className="text-gray-400" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-900">{reader?.name}</p>
                            <p className="text-xs text-gray-500">{reader?.cardNo}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {library?.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(record.borrowDate, 'yyyy-MM-dd')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(record.dueDate, 'yyyy-MM-dd')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-red-600">
                          {overdueDays} 天
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-orange-600">
                          ¥{record.fine.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            record.reminderCount > 0
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {record.reminderCount} 次
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setDetailRecord(record.id)}
                            className="px-3 py-1.5 text-xs text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                          >
                            详情
                          </button>
                          <button
                            onClick={() => handleSendReminder(record.id)}
                            className="px-3 py-1.5 text-xs text-white bg-red-500 rounded hover:bg-red-600 transition-colors"
                          >
                            催还
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Modal
        isOpen={reminderModalOpen}
        onClose={() => setReminderModalOpen(false)}
        title="发送催还通知"
        size="sm"
      >
        <p className="text-gray-600 mb-4">选择催还方式：</p>
        <div className="grid grid-cols-3 gap-3 mb-6">
          <button
            onClick={() => setReminderMethod('email')}
            className={`p-4 rounded-lg border-2 text-center transition-all ${
              reminderMethod === 'email'
                ? 'border-[#d4a853] bg-[#d4a853]/5'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <Mail size={24} className="mx-auto mb-2 text-gray-600" />
            <span className="text-sm font-medium">邮件</span>
          </button>
          <button
            onClick={() => setReminderMethod('phone')}
            className={`p-4 rounded-lg border-2 text-center transition-all ${
              reminderMethod === 'phone'
                ? 'border-[#d4a853] bg-[#d4a853]/5'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <Phone size={24} className="mx-auto mb-2 text-gray-600" />
            <span className="text-sm font-medium">电话</span>
          </button>
          <button
            onClick={() => setReminderMethod('sms')}
            className={`p-4 rounded-lg border-2 text-center transition-all ${
              reminderMethod === 'sms'
                ? 'border-[#d4a853] bg-[#d4a853]/5'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <MessageSquare size={24} className="mx-auto mb-2 text-gray-600" />
            <span className="text-sm font-medium">短信</span>
          </button>
        </div>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setReminderModalOpen(false)}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            取消
          </button>
          <button
            onClick={confirmSendReminder}
            className="px-4 py-2 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2a4d73] transition-colors"
          >
            发送
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={!!detailRecord}
        onClose={() => setDetailRecord(null)}
        title="逾期详情"
        size="lg"
      >
        {currentRecord && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">图书：</span>
                <span className="font-medium">
                  {getBookById(getCopyById(currentRecord.copyId)?.bookId || '')?.title}
                </span>
              </div>
              <div>
                <span className="text-gray-500">副本：</span>
                <span className="font-medium">
                  {getCopyById(currentRecord.copyId)?.barcode}
                </span>
              </div>
              <div>
                <span className="text-gray-500">读者：</span>
                <span className="font-medium">
                  {getReaderById(currentRecord.readerId)?.name}
                </span>
              </div>
              <div>
                <span className="text-gray-500">借出馆点：</span>
                <span className="font-medium">
                  {getLibraryById(currentRecord.borrowLibraryId)?.name}
                </span>
              </div>
              <div>
                <span className="text-gray-500">借出日期：</span>
                <span>{formatDate(currentRecord.borrowDate, 'yyyy-MM-dd')}</span>
              </div>
              <div>
                <span className="text-gray-500">应还日期：</span>
                <span>{formatDate(currentRecord.dueDate, 'yyyy-MM-dd')}</span>
              </div>
              <div>
                <span className="text-gray-500">逾期天数：</span>
                <span className="text-red-600 font-medium">
                  {getOverdueDays(currentRecord.dueDate)} 天
                </span>
              </div>
              <div>
                <span className="text-gray-500">累计罚款：</span>
                <span className="text-orange-600 font-medium">
                  ¥{currentRecord.fine.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-gray-500">续借次数：</span>
                <span>{currentRecord.renewTimes} 次</span>
              </div>
              <div>
                <span className="text-gray-500">催还次数：</span>
                <span>{currentRecord.reminderCount} 次</span>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <h4 className="font-medium text-gray-900 mb-3">催还记录</h4>
              {reminderRecords.length === 0 ? (
                <p className="text-sm text-gray-400">暂无催还记录</p>
              ) : (
                <div className="space-y-2">
                  {reminderRecords.map((rem) => (
                    <div
                      key={rem.id}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
                    >
                      <div className="flex items-center gap-2">
                        {rem.method === 'email' && <Mail size={14} className="text-blue-500" />}
                        {rem.method === 'phone' && <Phone size={14} className="text-green-500" />}
                        {rem.method === 'sms' && <MessageSquare size={14} className="text-purple-500" />}
                        <span className="text-gray-700">
                          {rem.method === 'email' && '邮件催还'}
                          {rem.method === 'phone' && '电话催还'}
                          {rem.method === 'sms' && '短信催还'}
                        </span>
                      </div>
                      <div className="text-gray-500">
                        <span className="text-xs">操作人：{rem.operator}</span>
                        <span className="mx-2">·</span>
                        <span className="text-xs">{formatDate(rem.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Toast
        type={toastType}
        message={toastMessage}
        isVisible={toastVisible}
        onClose={() => setToastVisible(false)}
      />
    </div>
  );
};
