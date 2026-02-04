import { app } from './firebase';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, query, where, getDocs, onSnapshot, serverTimestamp } from 'firebase/firestore';
import React, { useState, useRef, useEffect } from 'react';
import AuthForm from './AuthForm';
import { Search, Home, Users, Calendar, FileText, BarChart3, Plus, Edit2, Trash2, Award, Download, Printer, User, Mail, Phone, Loader, X, Menu, LogOut } from 'lucide-react';

export default function StudentManagementSystem() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [students, setStudents] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    class: '',
    email: '',
    phone: ''
  });

  const [attendance, setAttendance] = useState([]);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [todayDate] = useState(new Date().toISOString().split('T')[0]);

  const [exams, setExams] = useState([]);
  const [showRecordExamModal, setShowRecordExamModal] = useState(false);
  const [examFormData, setExamFormData] = useState({
    studentId: '',
    studentName: '',
    examName: '',
    subject: '',
    date: '',
    score: '',
    maxScore: '',
    grade: '',
    notes: ''
  });

  const [selectedStudentForReport, setSelectedStudentForReport] = useState(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const reportRef = useRef(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const auth = getAuth(app);
  const db = getFirestore(app);

  // Firestore collections
  const studentsCollection = collection(db, 'students');
  const attendanceCollection = collection(db, 'attendance');
  const examsCollection = collection(db, 'exams');

  // Check authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
      
      // Only load app data if user is logged in
      if (currentUser) {
        loadInitialData(currentUser.uid);
        setupRealtimeListeners(currentUser.uid);
      } else {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [auth]);

  // Load initial data from Firestore
  const loadInitialData = async (userId) => {
    try {
      setIsLoading(true);
      
      // Load students
      const studentsQuery = query(studentsCollection, where('createdBy', '==', userId));
      const studentsSnapshot = await getDocs(studentsQuery);
      const studentsList = studentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setStudents(studentsList);

      // Load attendance
      const attendanceQuery = query(attendanceCollection, where('createdBy', '==', userId));
      const attendanceSnapshot = await getDocs(attendanceQuery);
      const attendanceList = attendanceSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAttendance(attendanceList);

      // Load exams
      const examsQuery = query(examsCollection, where('createdBy', '==', userId));
      const examsSnapshot = await getDocs(examsQuery);
      const examsList = examsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setExams(examsList);

      setIsLoading(false);
    } catch (error) {
      console.error('Error loading data from Firestore:', error);
      alert('Error loading data. Please refresh the page.');
      setIsLoading(false);
    }
  };

  // Set up real-time listeners when user is logged in
  const setupRealtimeListeners = (userId) => {
    // Students listener
    const studentsQuery = query(studentsCollection, where('createdBy', '==', userId));
    const unsubscribeStudents = onSnapshot(studentsQuery, (snapshot) => {
      const studentsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setStudents(studentsList);
    }, (error) => {
      console.error('Error in students listener:', error);
    });

    // Attendance listener
    const attendanceQuery = query(attendanceCollection, where('createdBy', '==', userId));
    const unsubscribeAttendance = onSnapshot(attendanceQuery, (snapshot) => {
      const attendanceList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAttendance(attendanceList);
    }, (error) => {
      console.error('Error in attendance listener:', error);
    });

    // Exams listener
    const examsQuery = query(examsCollection, where('createdBy', '==', userId));
    const unsubscribeExams = onSnapshot(examsQuery, (snapshot) => {
      const examsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setExams(examsList);
    }, (error) => {
      console.error('Error in exams listener:', error);
    });

    return () => {
      unsubscribeStudents();
      unsubscribeAttendance();
      unsubscribeExams();
    };
  };

  // Clean up listeners when component unmounts
  useEffect(() => {
    let cleanupListeners;
    
    if (user) {
      cleanupListeners = setupRealtimeListeners(user.uid);
    }
    
    return () => {
      if (cleanupListeners) {
        cleanupListeners();
      }
    };
  }, [user]);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close mobile menu when switching tabs
  useEffect(() => {
    if (isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  }, [activeTab]);

  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Clear all local data on logout
      setStudents([]);
      setAttendance([]);
      setExams([]);
      setSearchQuery('');
      setActiveTab('home');
    } catch (error) {
      console.error('Logout error:', error);
      alert('Error logging out. Please try again.');
    }
  };

  // Get unique classes for filtering
  const uniqueClasses = [...new Set(students.map(student => student.class))];

  // Filter students based on search query
  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.class.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle adding a new student to Firestore
  const handleAddStudent = async () => {
    if (formData.name && formData.class && formData.email && formData.phone) {
      try {
        const newStudent = {
          ...formData,
          createdBy: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        await addDoc(studentsCollection, newStudent);
        
        setFormData({ name: '', class: '', email: '', phone: '' });
        setShowAddModal(false);
        alert('Student added successfully!');
      } catch (error) {
        console.error('Error adding student:', error);
        alert('Error adding student. Please try again.');
      }
    } else {
      alert('Please fill in all fields!');
    }
  };

  // Handle editing a student in Firestore
  const handleEditStudent = async () => {
    if (formData.name && formData.class && formData.email && formData.phone && editingStudent) {
      try {
        const studentRef = doc(db, 'students', editingStudent.id);
        await updateDoc(studentRef, {
          ...formData,
          updatedAt: serverTimestamp()
        });
        
        setFormData({ name: '', class: '', email: '', phone: '' });
        setEditingStudent(null);
        setShowEditModal(false);
        alert('Student updated successfully!');
      } catch (error) {
        console.error('Error updating student:', error);
        alert('Error updating student. Please try again.');
      }
    } else {
      alert('Please fill in all fields!');
    }
  };

  // Handle deleting a student from Firestore
  const handleDeleteStudent = async (id) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      try {
        const studentRef = doc(db, 'students', id);
        await deleteDoc(studentRef);
        
        // Also delete associated exams
        const examsQuery = query(examsCollection, 
          where('studentId', '==', id),
          where('createdBy', '==', user.uid)
        );
        const examsSnapshot = await getDocs(examsQuery);
        const deletePromises = examsSnapshot.docs.map(examDoc => 
          deleteDoc(doc(db, 'exams', examDoc.id))
        );
        await Promise.all(deletePromises);
        
        // Also delete associated attendance records
        const attendanceQuery = query(attendanceCollection, 
          where('studentId', '==', id),
          where('createdBy', '==', user.uid)
        );
        const attendanceSnapshot = await getDocs(attendanceQuery);
        const deleteAttendancePromises = attendanceSnapshot.docs.map(attendanceDoc => 
          deleteDoc(doc(db, 'attendance', attendanceDoc.id))
        );
        await Promise.all(deleteAttendancePromises);
        
        alert('Student and all associated records deleted successfully!');
      } catch (error) {
        console.error('Error deleting student:', error);
        alert('Error deleting student. Please try again.');
      }
    }
  };

  // Open edit modal with student data
  const openEditModal = (student) => {
    setEditingStudent(student);
    setFormData({
      name: student.name,
      class: student.class,
      email: student.email,
      phone: student.phone
    });
    setShowEditModal(true);
  };

  // Close all modals
  const closeModals = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setShowAttendanceModal(false);
    setShowRecordExamModal(false);
    setEditingStudent(null);
    setFormData({ name: '', class: '', email: '', phone: '' });
    setExamFormData({
      studentId: '',
      studentName: '',
      examName: '',
      subject: '',
      date: '',
      score: '',
      maxScore: '',
      grade: '',
      notes: ''
    });
  };

  // Mark attendance for a student and save to Firestore
  const markAttendance = async (studentId, status) => {
    try {
      const student = students.find(s => s.id === studentId);
      if (!student) {
        alert('Student not found!');
        return;
      }

      // Check for existing attendance record for today
      const attendanceQuery = query(
        attendanceCollection,
        where('studentId', '==', studentId),
        where('date', '==', todayDate),
        where('createdBy', '==', user.uid)
      );
      
      const querySnapshot = await getDocs(attendanceQuery);
      
      if (!querySnapshot.empty) {
        // Update existing record
        const existingDoc = querySnapshot.docs[0];
        await updateDoc(doc(db, 'attendance', existingDoc.id), {
          status,
          updatedAt: serverTimestamp()
        });
      } else {
        // Create new record
        const newRecord = {
          studentId: student.id,
          name: student.name,
          class: student.class,
          date: todayDate,
          status,
          createdBy: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        await addDoc(attendanceCollection, newRecord);
      }
    } catch (error) {
      console.error('Error marking attendance:', error);
      alert('Error marking attendance. Please try again.');
    }
  };

  // Get today's attendance for a student
  const getTodayAttendance = (studentId) => {
    const record = attendance.find(
      a => a.studentId === studentId && a.date === todayDate
    );
    return record?.status || null;
  };

  // Open record exam modal
  const openRecordExamModal = (student = null) => {
    if (student) {
      setExamFormData({
        ...examFormData,
        studentId: student.id,
        studentName: student.name,
        date: todayDate
      });
    } else {
      setExamFormData({
        ...examFormData,
        date: todayDate
      });
    }
    setShowRecordExamModal(true);
  };

  // Calculate grade based on score
  const calculateGrade = (score, maxScore) => {
    if (!score || !maxScore || maxScore === 0) return '';
    const percentage = (parseFloat(score) / parseFloat(maxScore)) * 100;
    
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
  };

  // Handle recording an exam to Firestore
  const handleRecordExam = async () => {
    if (examFormData.studentId && examFormData.examName && examFormData.subject && examFormData.score && examFormData.maxScore) {
      try {
        const studentId = examFormData.studentId;
        const student = students.find(s => s.id === studentId);
        
        if (!student) {
          alert('Student not found!');
          return;
        }
        
        const grade = calculateGrade(examFormData.score, examFormData.maxScore);
        const percentage = examFormData.maxScore ? Math.round((parseFloat(examFormData.score) / parseFloat(examFormData.maxScore)) * 100) : 0;
        
        const newExam = {
          studentId: studentId,
          studentName: student.name,
          examName: examFormData.examName,
          subject: examFormData.subject,
          date: examFormData.date,
          score: parseFloat(examFormData.score),
          maxScore: parseFloat(examFormData.maxScore),
          grade,
          notes: examFormData.notes,
          percentage: percentage,
          createdBy: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        await addDoc(examsCollection, newExam);
        
        setExamFormData({
          studentId: '',
          studentName: '',
          examName: '',
          subject: '',
          date: '',
          score: '',
          maxScore: '',
          grade: '',
          notes: ''
        });
        setShowRecordExamModal(false);
        
        alert(`Exam result recorded successfully for ${student.name}!`);
      } catch (error) {
        console.error('Error recording exam:', error);
        alert('Error recording exam result. Please try again.');
      }
    } else {
      alert('Please fill in all required fields!');
    }
  };

  // Handle deleting an exam from Firestore
  const handleDeleteExam = async (id) => {
    if (window.confirm('Are you sure you want to delete this exam result?')) {
      try {
        const examRef = doc(db, 'exams', id);
        await deleteDoc(examRef);
        alert('Exam result deleted successfully!');
      } catch (error) {
        console.error('Error deleting exam:', error);
        alert('Error deleting exam result. Please try again.');
      }
    }
  };

  // Get exams for a specific student
  const getStudentExams = (studentId) => {
    return exams.filter(exam => exam.studentId === studentId);
  };

  // Get average score for a student
  const getStudentAverage = (studentId) => {
    const studentExams = getStudentExams(studentId);
    if (studentExams.length === 0) return 0;
    
    const totalPercentage = studentExams.reduce((sum, exam) => sum + exam.percentage, 0);
    return Math.round(totalPercentage / studentExams.length);
  };

  // Get attendance summary for a student
  const getStudentAttendanceSummary = (studentId) => {
    const studentAttendance = attendance.filter(a => a.studentId === studentId);
    const presentCount = studentAttendance.filter(a => a.status === 'Present').length;
    const absentCount = studentAttendance.filter(a => a.status === 'Absent').length;
    const totalCount = studentAttendance.length;
    
    return {
      presentCount,
      absentCount,
      totalCount,
      attendanceRate: totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0
    };
  };

  // Generate and print report
  const generateStudentReport = async (studentId) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;
    
    setIsGeneratingReport(true);
    setSelectedStudentForReport(student);
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    if (reportRef.current) {
      const reportContent = reportRef.current.innerHTML;
      
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Student Report - ${student.name}</title>
            <style>
              @media print {
                body { 
                  margin: 0; 
                  padding: 20px; 
                  font-family: Arial, sans-serif; 
                  color: #000;
                  background: white !important;
                }
                .report-container {
                  max-width: 800px;
                  margin: 0 auto;
                  padding: 20px;
                  background: white;
                }
                .report-header {
                  text-align: center;
                  border-bottom: 3px solid #133215;
                  padding-bottom: 20px;
                  margin-bottom: 30px;
                }
                .student-info {
                  background: #f8f9fa;
                  padding: 20px;
                  border-radius: 8px;
                  margin-bottom: 30px;
                }
                .stats-grid {
                  display: grid;
                  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                  gap: 20px;
                  margin: 30px 0;
                }
                .stat-card {
                  background: white;
                  border: 1px solid #ddd;
                  border-radius: 8px;
                  padding: 20px;
                  text-align: center;
                }
                table {
                  width: 100%;
                  border-collapse: collapse;
                  margin: 20px 0;
                }
                th {
                  background: #133215;
                  color: #F3E8D3;
                  padding: 12px;
                  text-align: left;
                }
                td {
                  padding: 12px;
                  border-bottom: 1px solid #ddd;
                }
                tr:nth-child(even) {
                  background: #f8f9fa;
                }
                .grade-A { color: #28a745; font-weight: bold; }
                .grade-B { color: #007bff; font-weight: bold; }
                .grade-C { color: #ffc107; font-weight: bold; }
                .grade-D { color: #fd7e14; font-weight: bold; }
                .grade-F { color: #dc3545; font-weight: bold; }
                .no-print { display: none !important; }
                .print-only { display: block !important; }
                h1, h2, h3 { color: #133215; }
                .date-stamp {
                  text-align: right;
                  margin-top: 40px;
                  font-size: 14px;
                  color: #666;
                }
                .page-break {
                  page-break-before: always;
                }
              }
              @media screen {
                .print-only { display: none; }
              }
              body { 
                margin: 0; 
                padding: 20px; 
                font-family: Arial, sans-serif; 
                color: #000;
                background: white;
              }
              .report-container {
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
                background: white;
              }
              .report-header {
                text-align: center;
                border-bottom: 3px solid #133215;
                padding-bottom: 20px;
                margin-bottom: 30px;
              }
              .student-info {
                background: #f8f9fa;
                padding: 20px;
                border-radius: 8px;
                margin-bottom: 30px;
              }
              .stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 20px;
                margin: 30px 0;
              }
              .stat-card {
                background: white;
                border: 1px solid #ddd;
                border-radius: 8px;
                padding: 20px;
                text-align: center;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
              }
              th {
                background: #133215;
                color: #F3E8D3;
                padding: 12px;
                text-align: left;
              }
              td {
                padding: 12px;
                border-bottom: 1px solid #ddd;
              }
              tr:nth-child(even) {
                background: #f8f9fa;
              }
              .grade-A { color: #28a745; font-weight: bold; }
              .grade-B { color: #007bff; font-weight: bold; }
              .grade-C { color: #ffc107; font-weight: bold; }
              .grade-D { color: #fd7e14; font-weight: bold; }
              .grade-F { color: #dc3545; font-weight: bold; }
              h1, h2, h3 { color: #133215; }
              .date-stamp {
                text-align: right;
                margin-top: 40px;
                font-size: 14px;
                color: #666;
              }
            </style>
          </head>
          <body>
            ${reportContent}
            <div class="date-stamp">
              Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </div>
            <script>
              window.onload = function() {
                window.focus();
                window.print();
                setTimeout(() => {
                  window.close();
                }, 500);
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
    setIsGeneratingReport(false);
  };

  // Download report as HTML
  const downloadStudentReport = async (studentId) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;
    
    setIsGeneratingReport(true);
    setSelectedStudentForReport(student);
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    if (reportRef.current) {
      const reportContent = reportRef.current.innerHTML;
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Student Report - ${student.name}</title>
            <style>
              body { 
                margin: 0; 
                padding: 20px; 
                font-family: Arial, sans-serif; 
                color: #000;
              }
              .report-container {
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
                background: white;
              }
              .report-header {
                text-align: center;
                border-bottom: 3px solid #133215;
                padding-bottom: 20px;
                margin-bottom: 30px;
              }
              .student-info {
                background: #f8f9fa;
                padding: 20px;
                border-radius: 8px;
                margin-bottom: 30px;
              }
              .stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 20px;
                margin: 30px 0;
              }
              .stat-card {
                background: white;
                border: 1px solid #ddd;
                border-radius: 8px;
                padding: 20px;
                text-align: center;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
              }
              th {
                background: #133215;
                color: #F3E8D3;
                padding: 12px;
                text-align: left;
              }
              td {
                padding: 12px;
                border-bottom: 1px solid #ddd;
              }
              tr:nth-child(even) {
                background: #f8f9fa;
              }
              .grade-A { color: #28a745; font-weight: bold; }
              .grade-B { color: #007bff; font-weight: bold; }
              .grade-C { color: #ffc107; font-weight: bold; }
              .grade-D { color: #fd7e14; font-weight: bold; }
              .grade-F { color: #dc3545; font-weight: bold; }
              h1, h2, h3 { color: #133215; }
              .date-stamp {
                text-align: right;
                margin-top: 40px;
                font-size: 14px;
                color: #666;
              }
            </style>
          </head>
          <body>
            ${reportContent}
            <div class="date-stamp">
              Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </div>
          </body>
        </html>
      `;
      
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Student_Report_${student.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    setIsGeneratingReport(false);
  };

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'attendance', label: 'Attendance', icon: Calendar },
    { id: 'exams', label: 'Tests & Exams', icon: FileText },
    { id: 'report', label: 'Report', icon: BarChart3 },
  ];

  // Render home dashboard
  const renderHome = () => {
    const totalExams = exams.length;
    const averageScoreAll = students.length > 0 && totalExams > 0
      ? Math.round(exams.reduce((sum, exam) => sum + exam.percentage, 0) / totalExams)
      : 0;
    const topStudents = [...students]
      .map(student => ({
        ...student,
        average: getStudentAverage(student.id)
      }))
      .sort((a, b) => b.average - a.average)
      .slice(0, 3);

    return (
      <div className="space-y-6 animate-fadeIn">
        <h2 className="text-2xl md:text-3xl font-bold text-[#133215] px-2 md:px-0">Dashboard Overview</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 px-2 md:px-0">
          <div className="bg-[#F3E8D3] rounded-lg shadow-md p-4 md:p-6 border-l-4 border-[#133215] animate-slideInUp" style={{animationDelay: '0.1s'}}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Students</p>
                <p className="text-2xl md:text-3xl font-bold text-[#133215]">{students.length}</p>
              </div>
              <Users className="w-8 h-8 md:w-12 md:h-12 text-[#133215]" />
            </div>
          </div>
          <div className="bg-[#F3E8D3] rounded-lg shadow-md p-4 md:p-6 border-l-4 border-[#92B775] animate-slideInUp" style={{animationDelay: '0.2s'}}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Present Today</p>
                <p className="text-2xl md:text-3xl font-bold text-[#133215]">
                  {attendance.filter(a => a.status === 'Present' && a.date === todayDate).length}
                </p>
              </div>
              <Calendar className="w-8 h-8 md:w-12 md:h-12 text-[#92B775]" />
            </div>
          </div>
          <div className="bg-[#F3E8D3] rounded-lg shadow-md p-4 md:p-6 border-l-4 border-[#92B775]/70 animate-slideInUp" style={{animationDelay: '0.3s'}}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Exams Recorded</p>
                <p className="text-2xl md:text-3xl font-bold text-[#133215]">{totalExams}</p>
              </div>
              <FileText className="w-8 h-8 md:w-12 md:h-12 text-[#92B775]/70" />
            </div>
          </div>
          <div className="bg-[#F3E8D3] rounded-lg shadow-md p-4 md:p-6 border-l-4 border-[#133215]/80 animate-slideInUp" style={{animationDelay: '0.4s'}}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Average Score</p>
                <p className="text-2xl md:text-3xl font-bold text-[#133215]">{averageScoreAll}%</p>
              </div>
              <Award className="w-8 h-8 md:w-12 md:h-12 text-[#133215]/80" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 px-2 md:px-0">
          <div className="bg-[#F3E8D3] rounded-lg shadow-md p-4 md:p-6 animate-slideInUp" style={{animationDelay: '0.5s'}}>
            <h3 className="text-lg md:text-xl font-semibold text-[#133215] mb-4">Top Performers</h3>
            {topStudents.filter(s => s.average > 0).length === 0 ? (
              <p className="text-gray-500 text-center py-4">No exam results recorded yet</p>
            ) : (
              <div className="space-y-3 md:space-y-4">
                {topStudents.map((student, index) => (
                  <div key={student.id} className="flex items-center justify-between p-3 bg-[#92B775]/20 rounded-lg hover:bg-[#92B775]/30 transition">
                    <div className="flex items-center gap-2 md:gap-3">
                      <div className={`w-6 h-6 md:w-8 md:h-8 flex items-center justify-center rounded-full ${
                        index === 0 ? 'bg-yellow-100 text-yellow-800' :
                        index === 1 ? 'bg-gray-100 text-gray-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        <span className="font-bold text-sm md:text-base">{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm md:text-base">{student.name}</p>
                        <p className="text-xs text-gray-600">Class {student.class}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-base md:text-lg font-bold text-[#133215]">{student.average}%</p>
                      <p className="text-xs text-gray-500">Average Score</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderStudents = () => (
    <div className="space-y-4 md:space-y-6 animate-fadeIn px-2 md:px-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h2 className="text-2xl md:text-3xl font-bold text-[#133215]">Students</h2>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-[#133215] text-[#F3E8D3] px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-[#133215]/90 transition transform hover:scale-105 active:scale-95 w-full sm:w-auto justify-center"
        >
          <Plus className="w-5 h-5" />
          Add Student
        </button>
      </div>
      
      <div className="bg-[#F3E8D3] rounded-lg shadow-md p-3 md:p-4 animate-slideInUp">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 md:w-5 md:h-5" />
          <input
            type="text"
            placeholder="Search students by name, class, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 md:pl-10 pr-4 py-2 md:py-3 border border-[#92B775] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#133215] bg-white transition text-sm md:text-base"
          />
        </div>
      </div>

      <div className="bg-[#F3E8D3] rounded-lg shadow-md overflow-hidden animate-slideInUp" style={{animationDelay: '0.2s'}}>
        {filteredStudents.length === 0 ? (
          <div className="text-center py-8 md:py-12">
            <Users className="w-12 h-12 md:w-16 md:h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-base md:text-lg">No students found</p>
            <p className="text-gray-400 text-sm mt-2">
              {students.length === 0 ? 'Click "Add Student" to get started' : 'Try adjusting your search'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="bg-[#133215] text-[#F3E8D3]">
                <tr>
                  <th className="px-4 py-2 md:px-6 md:py-3 text-left text-sm md:text-base">Name</th>
                  <th className="px-4 py-2 md:px-6 md:py-3 text-left text-sm md:text-base">Class</th>
                  <th className="px-4 py-2 md:px-6 md:py-3 text-left text-sm md:text-base">Email</th>
                  <th className="px-4 py-2 md:px-6 md:py-3 text-left text-sm md:text-base">Phone</th>
                  <th className="px-4 py-2 md:px-6 md:py-3 text-left text-sm md:text-base">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student, index) => (
                  <tr 
                    key={student.id} 
                    className={`${index % 2 === 0 ? 'bg-[#92B775]/20' : 'bg-white'} hover:bg-[#92B775]/30 transition animate-fadeIn`}
                    style={{animationDelay: `${index * 0.05}s`}}
                  >
                    <td className="px-4 py-3 md:px-6 md:py-4 text-gray-900 text-sm md:text-base">{student.name}</td>
                    <td className="px-4 py-3 md:px-6 md:py-4 text-gray-700 text-sm md:text-base">{student.class}</td>
                    <td className="px-4 py-3 md:px-6 md:py-4 text-gray-700 text-sm md:text-base">{student.email}</td>
                    <td className="px-4 py-3 md:px-6 md:py-4 text-gray-700 text-sm md:text-base">{student.phone}</td>
                    <td className="px-4 py-3 md:px-6 md:py-4">
                      <div className="flex gap-1 md:gap-2">
                        <button 
                          onClick={() => openEditModal(student)}
                          className="text-[#133215] hover:text-[#133215]/80 transition transform hover:scale-110 active:scale-95"
                          title="Edit Student"
                        >
                          <Edit2 className="w-3 h-3 md:w-4 md:h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteStudent(student.id)}
                          className="text-red-600 hover:text-red-800 transition transform hover:scale-110 active:scale-95"
                          title="Delete Student"
                        >
                          <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedStudentForReport(student);
                            setActiveTab('report');
                          }}
                          className="text-blue-600 hover:text-blue-800 transition transform hover:scale-110 active:scale-95"
                          title="Generate Report"
                        >
                          <BarChart3 className="w-3 h-3 md:w-4 md:h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  const renderAttendance = () => (
    <div className="space-y-4 md:space-y-6 animate-fadeIn px-2 md:px-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h2 className="text-2xl md:text-3xl font-bold text-[#133215]">Attendance</h2>
        <button 
          onClick={() => setShowAttendanceModal(true)}
          className="bg-[#133215] text-[#F3E8D3] px-4 py-2 rounded-lg hover:bg-[#133215]/90 transition transform hover:scale-105 active:scale-95 w-full sm:w-auto justify-center"
        >
          Mark Attendance
        </button>
      </div>

      <div className="bg-[#F3E8D3] rounded-lg shadow-md overflow-hidden animate-slideInUp">
        {attendance.length === 0 ? (
          <div className="text-center py-8 md:py-12">
            <Calendar className="w-12 h-12 md:w-16 md:h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-base md:text-lg">No attendance records yet</p>
            <p className="text-gray-400 text-sm mt-2">Start marking attendance to see records here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="bg-[#133215] text-[#F3E8D3]">
                <tr>
                  <th className="px-4 py-2 md:px-6 md:py-3 text-left text-sm md:text-base">Student Name</th>
                  <th className="px-4 py-2 md:px-6 md:py-3 text-left text-sm md:text-base">Class</th>
                  <th className="px-4 py-2 md:px-6 md:py-3 text-left text-sm md:text-base">Date</th>
                  <th className="px-4 py-2 md:px-6 md:py-3 text-left text-sm md:text-base">Status</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map((record, index) => (
                  <tr 
                    key={record.id} 
                    className={`${index % 2 === 0 ? 'bg-[#92B775]/20' : 'bg-white'} hover:bg-[#92B775]/30 transition animate-fadeIn`}
                    style={{animationDelay: `${index * 0.05}s`}}
                  >
                    <td className="px-4 py-3 md:px-6 md:py-4 text-gray-900 text-sm md:text-base">{record.name}</td>
                    <td className="px-4 py-3 md:px-6 md:py-4 text-gray-700 text-sm md:text-base">{record.class}</td>
                    <td className="px-4 py-3 md:px-6 md:py-4 text-gray-700 text-sm md:text-base">{record.date}</td>
                    <td className="px-4 py-3 md:px-6 md:py-4">
                      <span className={`px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-medium transition ${
                        record.status === 'Present' ? 'bg-green-100 text-green-800 hover:bg-green-200' :
                        record.status === 'Absent' ? 'bg-red-100 text-red-800 hover:bg-red-200' :
                        'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                      }`}>
                        {record.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  const renderExams = () => {
    // Filter exams based on selected student or search query
    const filteredExams = exams.filter(exam => {
      const student = students.find(s => s.id === exam.studentId);
      if (!student) return false;
      
      // If search query exists, filter by student name
      if (searchQuery) {
        return student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
               student.class.toLowerCase().includes(searchQuery.toLowerCase());
      }
      
      return true;
    });

    return (
      <div className="space-y-4 md:space-y-6 animate-fadeIn px-2 md:px-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h2 className="text-2xl md:text-3xl font-bold text-[#133215]">Tests & Exams</h2>
          <button 
            onClick={() => openRecordExamModal()}
            className="bg-[#133215] text-[#F3E8D3] px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-[#133215]/90 transition transform hover:scale-105 active:scale-95 w-full sm:w-auto justify-center"
          >
            <Plus className="w-5 h-5" />
            Record Test/Exam
          </button>
        </div>

        {/* Filter Options */}
        <div className="bg-[#F3E8D3] rounded-lg shadow-md p-3 md:p-4 animate-slideInUp">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div>
              <label className="block text-gray-700 mb-1 md:mb-2 text-sm md:text-base">Filter by Class</label>
              <select 
                className="w-full px-3 md:px-4 py-2 border border-[#92B775] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#133215] bg-white transition text-sm md:text-base"
                onChange={(e) => {
                  if (e.target.value) {
                    setSearchQuery(e.target.value);
                  } else {
                    setSearchQuery('');
                  }
                }}
              >
                <option value="">All Classes</option>
                {uniqueClasses.map(cls => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-700 mb-1 md:mb-2 text-sm md:text-base">Search Student</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 md:w-5 md:h-5" />
                <input
                  type="text"
                  placeholder="Search students by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 md:pl-10 pr-4 py-2 border border-[#92B775] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#133215] bg-white transition text-sm md:text-base"
                />
              </div>
            </div>
          </div>
        </div>

        {/* All Exams View */}
        <div className="bg-[#F3E8D3] rounded-lg shadow-md overflow-hidden animate-slideInUp" style={{animationDelay: '0.2s'}}>
          <div className="bg-[#133215] text-[#F3E8D3] px-4 md:px-6 py-3 md:py-4">
            <h3 className="text-lg md:text-xl font-semibold">All Exam Results</h3>
            <p className="text-xs md:text-sm opacity-90 mt-1">Total: {exams.length} records</p>
          </div>
          
          {exams.length === 0 ? (
            <div className="text-center py-8 md:py-12">
              <FileText className="w-12 h-12 md:w-16 md:h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-base md:text-lg">No exam results recorded yet</p>
              <p className="text-gray-400 text-sm mt-2">Record exam results to see them here</p>
              <button 
                onClick={() => openRecordExamModal()}
                className="mt-4 bg-[#133215] text-[#F3E8D3] px-4 py-2 rounded-lg hover:bg-[#133215]/90 transition"
              >
                Record First Exam
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead className="bg-[#92B775]/30">
                  <tr>
                    <th className="px-4 py-2 md:px-6 md:py-3 text-left text-gray-700 text-sm md:text-base">Student</th>
                    <th className="px-4 py-2 md:px-6 md:py-3 text-left text-gray-700 text-sm md:text-base">Class</th>
                    <th className="px-4 py-2 md:px-6 md:py-3 text-left text-gray-700 text-sm md:text-base">Exam</th>
                    <th className="px-4 py-2 md:px-6 md:py-3 text-left text-gray-700 text-sm md:text-base">Subject</th>
                    <th className="px-4 py-2 md:px-6 md:py-3 text-left text-gray-700 text-sm md:text-base">Date</th>
                    <th className="px-4 py-2 md:px-6 md:py-3 text-left text-gray-700 text-sm md:text-base">Score</th>
                    <th className="px-4 py-2 md:px-6 md:py-3 text-left text-gray-700 text-sm md:text-base">Grade</th>
                    <th className="px-4 py-2 md:px-6 md:py-3 text-left text-gray-700 text-sm md:text-base">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {exams.map((exam, index) => {
                    const student = students.find(s => s.id === exam.studentId);
                    return (
                      <tr 
                        key={exam.id} 
                        className={`${index % 2 === 0 ? 'bg-[#92B775]/10' : 'bg-white'} hover:bg-[#92B775]/20 transition animate-fadeIn`}
                        style={{animationDelay: `${index * 0.05}s`}}
                      >
                        <td className="px-4 py-3 md:px-6 md:py-4 text-gray-900 text-sm md:text-base">{student?.name || exam.studentName}</td>
                        <td className="px-4 py-3 md:px-6 md:py-4 text-gray-700 text-sm md:text-base">{student?.class || 'N/A'}</td>
                        <td className="px-4 py-3 md:px-6 md:py-4 text-gray-900 text-sm md:text-base">{exam.examName}</td>
                        <td className="px-4 py-3 md:px-6 md:py-4 text-gray-700 text-sm md:text-base">{exam.subject}</td>
                        <td className="px-4 py-3 md:px-6 md:py-4 text-gray-700 text-sm md:text-base">{exam.date}</td>
                        <td className="px-4 py-3 md:px-6 md:py-4">
                          <div className="flex items-center gap-1 md:gap-2">
                            <span className="font-bold text-[#133215] text-sm md:text-base">
                              {exam.score}/{exam.maxScore}
                            </span>
                            <span className="text-xs md:text-sm text-gray-600">
                              ({exam.percentage}%)
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 md:px-6 md:py-4">
                          <span className={`px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-medium transition ${
                            exam.grade === 'A' ? 'bg-green-100 text-green-800 hover:bg-green-200' :
                            exam.grade === 'B' ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' :
                            exam.grade === 'C' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' :
                            exam.grade === 'D' ? 'bg-orange-100 text-orange-800 hover:bg-orange-200' :
                            'bg-red-100 text-red-800 hover:bg-red-200'
                          }`}>
                            {exam.grade}
                          </span>
                        </td>
                        <td className="px-4 py-3 md:px-6 md:py-4">
                          <button 
                            onClick={() => handleDeleteExam(exam.id)}
                            className="text-red-600 hover:text-red-800 transition transform hover:scale-110 active:scale-95"
                            title="Delete Exam Result"
                          >
                            <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Students with Exams Summary */}
        <div className="space-y-4 md:space-y-6">
          <h3 className="text-xl md:text-2xl font-bold text-[#133215] px-2 md:px-0">Students Performance Summary</h3>
          
          {students.length === 0 ? (
            <div className="bg-[#F3E8D3] rounded-lg shadow-md p-6 md:p-8 text-center animate-pulse">
              <Users className="w-12 h-12 md:w-16 md:h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-base md:text-lg">No students found</p>
              <p className="text-gray-400 text-sm mt-2">Add students first to see their exam performance</p>
            </div>
          ) : (
            filteredStudents.map((student, studentIndex) => {
              const studentExams = getStudentExams(student.id);
              const averageScore = getStudentAverage(student.id);
              
              return (
                <div 
                  key={student.id} 
                  className="bg-[#F3E8D3] rounded-lg shadow-md overflow-hidden animate-slideInUp"
                  style={{animationDelay: `${studentIndex * 0.1}s`}}
                >
                  {/* Student Header */}
                  <div className="bg-[#92B775]/20 p-3 md:p-4 border-b border-[#92B775]/30">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
                      <div>
                        <h4 className="text-lg md:text-xl font-semibold text-[#133215]">{student.name}</h4>
                        <p className="text-gray-600 text-sm">Class: {student.class} | Email: {student.email}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 md:gap-3">
                        <button 
                          onClick={() => openRecordExamModal(student)}
                          className="bg-[#133215] text-[#F3E8D3] px-3 md:px-4 py-1 md:py-2 rounded-lg flex items-center gap-1 md:gap-2 hover:bg-[#133215]/90 transition transform hover:scale-105 active:scale-95 text-xs md:text-sm"
                        >
                          <Plus className="w-3 h-3 md:w-4 md:h-4" />
                          Add Exam Result
                        </button>
                        <div className="bg-white border border-[#92B775] rounded-lg px-2 md:px-4 py-1 md:py-2 transition hover:shadow-md">
                          <p className="text-xs text-gray-600">Average Score</p>
                          <p className="text-base md:text-lg font-bold text-[#133215]">{averageScore}%</p>
                        </div>
                        <div className="bg-white border border-[#92B775] rounded-lg px-2 md:px-4 py-1 md:py-2 transition hover:shadow-md">
                          <p className="text-xs text-gray-600">Exams Taken</p>
                          <p className="text-base md:text-lg font-bold text-[#133215]">{studentExams.length}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Exam Results Table */}
                  <div className="p-3 md:p-4">
                    {studentExams.length === 0 ? (
                      <div className="text-center py-4 md:py-8">
                        <FileText className="w-8 h-8 md:w-12 md:h-12 text-gray-300 mx-auto mb-3 md:mb-4" />
                        <p className="text-gray-500 text-sm md:text-base">No exam results recorded for {student.name}</p>
                        <button 
                          onClick={() => openRecordExamModal(student)}
                          className="mt-3 md:mt-4 text-[#133215] hover:text-[#133215]/80 font-medium transition text-sm md:text-base"
                        >
                          + Record first exam result
                        </button>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[640px]">
                          <thead className="bg-[#92B775]/30">
                            <tr>
                              <th className="px-3 md:px-4 py-2 md:py-3 text-left text-gray-700 text-sm md:text-base">Exam Name</th>
                              <th className="px-3 md:px-4 py-2 md:py-3 text-left text-gray-700 text-sm md:text-base">Subject</th>
                              <th className="px-3 md:px-4 py-2 md:py-3 text-left text-gray-700 text-sm md:text-base">Date</th>
                              <th className="px-3 md:px-4 py-2 md:py-3 text-left text-gray-700 text-sm md:text-base">Score</th>
                              <th className="px-3 md:px-4 py-2 md:py-3 text-left text-gray-700 text-sm md:text-base">Percentage</th>
                              <th className="px-3 md:px-4 py-2 md:py-3 text-left text-gray-700 text-sm md:text-base">Grade</th>
                              <th className="px-3 md:px-4 py-2 md:py-3 text-left text-gray-700 text-sm md:text-base">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {studentExams.map((exam, examIndex) => (
                              <tr 
                                key={exam.id} 
                                className="border-b border-gray-100 hover:bg-[#92B775]/10 transition animate-fadeIn"
                                style={{animationDelay: `${examIndex * 0.05}s`}}
                              >
                                <td className="px-3 md:px-4 py-2 md:py-3">
                                  <div>
                                    <p className="font-medium text-gray-900 text-sm md:text-base">{exam.examName}</p>
                                    {exam.notes && (
                                      <p className="text-xs text-gray-500 mt-1">{exam.notes}</p>
                                    )}
                                  </div>
                                </td>
                                <td className="px-3 md:px-4 py-2 md:py-3 text-gray-700 text-sm md:text-base">{exam.subject}</td>
                                <td className="px-3 md:px-4 py-2 md:py-3 text-gray-700 text-sm md:text-base">{exam.date}</td>
                                <td className="px-3 md:px-4 py-2 md:py-3">
                                  <span className="font-bold text-[#133215] text-sm md:text-base">
                                    {exam.score}/{exam.maxScore}
                                  </span>
                                </td>
                                <td className="px-3 md:px-4 py-2 md:py-3">
                                  <span className="font-bold text-[#133215] text-sm md:text-base">{exam.percentage}%</span>
                                </td>
                                <td className="px-3 md:px-4 py-2 md:py-3">
                                  <span className={`px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-medium transition ${
                                    exam.grade === 'A' ? 'bg-green-100 text-green-800 hover:bg-green-200' :
                                    exam.grade === 'B' ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' :
                                    exam.grade === 'C' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' :
                                    exam.grade === 'D' ? 'bg-orange-100 text-orange-800 hover:bg-orange-200' :
                                    'bg-red-100 text-red-800 hover:bg-red-200'
                                  }`}>
                                    {exam.grade}
                                  </span>
                                </td>
                                <td className="px-3 md:px-4 py-2 md:py-3">
                                  <button 
                                    onClick={() => handleDeleteExam(exam.id)}
                                    className="text-red-600 hover:text-red-800 transition transform hover:scale-110 active:scale-95"
                                    title="Delete Exam Result"
                                  >
                                    <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const ReportSection = () => {
    const [reportType, setReportType] = useState('student');
    const [dateRange, setDateRange] = useState('last30');

    return (
      <div className="space-y-4 md:space-y-6 animate-fadeIn px-2 md:px-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h2 className="text-2xl md:text-3xl font-bold text-[#133215]">Reports & Analytics</h2>
          {isGeneratingReport && (
            <div className="flex items-center gap-2 text-[#133215] text-sm md:text-base">
              <Loader className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
              <span>Generating report...</span>
            </div>
          )}
        </div>

        {/* Quick Report Actions */}
        <div className="bg-[#F3E8D3] rounded-lg shadow-md p-4 md:p-6 animate-slideInUp">
          <h3 className="text-lg md:text-xl font-semibold text-[#133215] mb-3 md:mb-4">Generate Quick Report</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-4 md:mb-6">
            <div>
              <label className="block text-gray-700 mb-1 md:mb-2 text-sm md:text-base">Report Type</label>
              <select 
                className="w-full px-3 md:px-4 py-2 border border-[#92B775] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#133215] bg-white transition text-sm md:text-base"
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
              >
                <option value="student">Student Performance Report</option>
                <option value="attendance">Attendance Summary</option>
                <option value="exams">Exam Results Analysis</option>
                <option value="class">Class Overview</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-700 mb-1 md:mb-2 text-sm md:text-base">Date Range</label>
              <select 
                className="w-full px-3 md:px-4 py-2 border border-[#92B775] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#133215] bg-white transition text-sm md:text-base"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
              >
                <option value="last7">Last 7 Days</option>
                <option value="last30">Last 30 Days</option>
                <option value="last90">Last Quarter</option>
                <option value="all">All Time</option>
              </select>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 md:gap-4">
            <button
              onClick={() => {
                if (students.length > 0) {
                  generateStudentReport(students[0].id);
                }
              }}
              className="bg-[#133215] text-[#F3E8D3] px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-[#133215]/90 transition transform hover:scale-105 active:scale-95 justify-center text-sm md:text-base"
              disabled={students.length === 0 || isGeneratingReport}
            >
              <Printer className="w-4 h-4" />
              Generate Sample Report
            </button>
          </div>
        </div>

        {/* Student Profiles Section */}
        <div className="bg-[#F3E8D3] rounded-lg shadow-md p-4 md:p-6 animate-slideInUp" style={{animationDelay: '0.2s'}}>
          <h3 className="text-lg md:text-xl font-semibold text-[#133215] mb-3 md:mb-4">Student Profiles & Reports</h3>
          <p className="text-gray-600 mb-4 md:mb-6 text-sm md:text-base">Select a student to generate and download their comprehensive report</p>
          
          {students.length === 0 ? (
            <div className="text-center py-6 md:py-8">
              <Users className="w-12 h-12 md:w-16 md:h-16 text-gray-300 mx-auto mb-3 md:mb-4" />
              <p className="text-gray-500 text-base md:text-lg">No students available</p>
              <p className="text-gray-400 text-sm mt-2">Add students to generate reports</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {students.map((student, index) => {
                const averageScore = getStudentAverage(student.id);
                const attendanceSummary = getStudentAttendanceSummary(student.id);
                const studentExams = getStudentExams(student.id);
                
                return (
                  <div 
                    key={student.id} 
                    className="bg-white rounded-lg shadow-md overflow-hidden border border-[#92B775] hover:shadow-lg transition transform hover:-translate-y-1 animate-fadeIn"
                    style={{animationDelay: `${index * 0.1}s`}}
                  >
                    <div className="bg-[#133215] text-[#F3E8D3] p-3 md:p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-base md:text-lg font-semibold">{student.name}</h4>
                          <p className="text-xs md:text-sm opacity-90">Class: {student.class}</p>
                        </div>
                        <User className="w-6 h-6 md:w-8 md:h-8" />
                      </div>
                    </div>
                    
                    <div className="p-3 md:p-4">
                      <div className="space-y-2 md:space-y-3 mb-3 md:mb-4">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Mail className="w-3 h-3 md:w-4 md:h-4" />
                          <span className="text-xs md:text-sm truncate">{student.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Phone className="w-3 h-3 md:w-4 md:h-4" />
                          <span className="text-xs md:text-sm">{student.phone}</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 md:gap-3 mb-3 md:mb-4">
                        <div className="text-center p-2 bg-[#F3E8D3] rounded transition hover:bg-[#F3E8D3]/80">
                          <p className="text-xl md:text-2xl font-bold text-[#133215]">{averageScore}%</p>
                          <p className="text-xs text-gray-600">Avg Score</p>
                        </div>
                        <div className="text-center p-2 bg-[#F3E8D3] rounded transition hover:bg-[#F3E8D3]/80">
                          <p className="text-xl md:text-2xl font-bold text-[#133215]">{attendanceSummary.attendanceRate}%</p>
                          <p className="text-xs text-gray-600">Attendance</p>
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-2">
                        <button
                          onClick={() => generateStudentReport(student.id)}
                          className="flex-1 bg-[#92B775] text-white px-3 py-2 rounded flex items-center justify-center gap-2 hover:bg-[#92B775]/80 transition transform hover:scale-105 active:scale-95 text-xs md:text-sm"
                          disabled={isGeneratingReport}
                        >
                          <Printer className="w-3 h-3 md:w-4 md:h-4" />
                          Print
                        </button>
                        <button
                          onClick={() => downloadStudentReport(student.id)}
                          className="flex-1 bg-[#133215] text-white px-3 py-2 rounded flex items-center justify-center gap-2 hover:bg-[#133215]/80 transition transform hover:scale-105 active:scale-95 text-xs md:text-sm"
                          disabled={isGeneratingReport}
                        >
                          <Download className="w-3 h-3 md:w-4 md:h-4" />
                          Download
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Report Preview Section */}
        {selectedStudentForReport && (
          <div className="bg-[#F3E8D3] rounded-lg shadow-md p-4 md:p-6 animate-slideInUp" style={{animationDelay: '0.3s'}}>
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-4 md:mb-6">
              <h3 className="text-lg md:text-xl font-semibold text-[#133215]">
                Report Preview: {selectedStudentForReport.name}
              </h3>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => generateStudentReport(selectedStudentForReport.id)}
                  className="bg-[#92B775] text-white px-3 md:px-4 py-2 rounded flex items-center justify-center gap-2 hover:bg-[#92B775]/80 transition transform hover:scale-105 active:scale-95 text-sm md:text-base"
                  disabled={isGeneratingReport}
                >
                  {isGeneratingReport ? (
                    <Loader className="w-3 h-3 md:w-4 md:h-4 animate-spin" />
                  ) : (
                    <Printer className="w-3 h-3 md:w-4 md:h-4" />
                  )}
                  {isGeneratingReport ? 'Generating...' : 'Print Report'}
                </button>
                <button
                  onClick={() => downloadStudentReport(selectedStudentForReport.id)}
                  className="bg-[#133215] text-white px-3 md:px-4 py-2 rounded flex items-center justify-center gap-2 hover:bg-[#133215]/80 transition transform hover:scale-105 active:scale-95 text-sm md:text-base"
                  disabled={isGeneratingReport}
                >
                  {isGeneratingReport ? (
                    <Loader className="w-3 h-3 md:w-4 md:h-4 animate-spin" />
                  ) : (
                    <Download className="w-3 h-3 md:w-4 md:h-4" />
                  )}
                  {isGeneratingReport ? 'Generating...' : 'Download Report'}
                </button>
              </div>
            </div>
            
            <div className="no-print">
              <p className="text-gray-600 mb-4 text-sm md:text-base">Preview of the report content. Use the buttons above to print or download.</p>
            </div>

            {/* Report Content - This will be used for printing/downloading */}
            <div ref={reportRef} className="report-container bg-white p-4 md:p-6 rounded-lg shadow-inner">
              <div className="report-header">
                <h1 className="text-xl md:text-3xl font-bold text-[#133215]">Student Performance Report</h1>
                <h2 className="text-lg md:text-2xl font-semibold text-[#133215] mt-2">{selectedStudentForReport.name}</h2>
                <p className="text-gray-600 mt-2 text-sm md:text-base">Class: {selectedStudentForReport.class}</p>
                <p className="text-gray-600 text-sm md:text-base">Report Period: All Time</p>
              </div>
              
              <div className="student-info">
                <h3 className="text-lg md:text-xl font-semibold text-[#133215] mb-2 md:mb-3">Student Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <p className="text-sm md:text-base"><strong>Full Name:</strong> {selectedStudentForReport.name}</p>
                    <p className="text-sm md:text-base"><strong>Class:</strong> {selectedStudentForReport.class}</p>
                  </div>
                  <div>
                    <p className="text-sm md:text-base"><strong>Email:</strong> {selectedStudentForReport.email}</p>
                    <p className="text-sm md:text-base"><strong>Phone:</strong> {selectedStudentForReport.phone}</p>
                  </div>
                </div>
              </div>
              
              <div className="stats-grid">
                <div className="stat-card">
                  <h4 className="text-base md:text-lg font-semibold text-[#133215]">Academic Performance</h4>
                  <p className="text-2xl md:text-3xl font-bold mt-2 text-[#133215]">{getStudentAverage(selectedStudentForReport.id)}%</p>
                  <p className="text-xs md:text-sm text-gray-600">Average Score</p>
                </div>
                
                <div className="stat-card">
                  <h4 className="text-base md:text-lg font-semibold text-[#133215]">Attendance Rate</h4>
                  <p className="text-2xl md:text-3xl font-bold mt-2 text-[#133215]">{getStudentAttendanceSummary(selectedStudentForReport.id).attendanceRate}%</p>
                  <p className="text-xs md:text-sm text-gray-600">Overall Attendance</p>
                </div>
                
                <div className="stat-card">
                  <h4 className="text-base md:text-lg font-semibold text-[#133215]">Exams Taken</h4>
                  <p className="text-2xl md:text-3xl font-bold mt-2 text-[#133215]">{getStudentExams(selectedStudentForReport.id).length}</p>
                  <p className="text-xs md:text-sm text-gray-600">Total Tests/Exams</p>
                </div>
              </div>
              
              <div className="mt-4 md:mt-6">
                <h3 className="text-lg md:text-xl font-semibold text-[#133215] mb-2 md:mb-3">Exam Results</h3>
                {getStudentExams(selectedStudentForReport.id).length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px]">
                      <thead>
                        <tr>
                          <th className="px-3 md:px-4 py-2 bg-[#133215] text-[#F3E8D3] text-sm md:text-base">Exam Name</th>
                          <th className="px-3 md:px-4 py-2 bg-[#133215] text-[#F3E8D3] text-sm md:text-base">Subject</th>
                          <th className="px-3 md:px-4 py-2 bg-[#133215] text-[#F3E8D3] text-sm md:text-base">Date</th>
                          <th className="px-3 md:px-4 py-2 bg-[#133215] text-[#F3E8D3] text-sm md:text-base">Score</th>
                          <th className="px-3 md:px-4 py-2 bg-[#133215] text-[#F3E8D3] text-sm md:text-base">Grade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getStudentExams(selectedStudentForReport.id).map((exam, index) => (
                          <tr key={exam.id} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                            <td className="px-3 md:px-4 py-2 border-b text-sm md:text-base">{exam.examName}</td>
                            <td className="px-3 md:px-4 py-2 border-b text-sm md:text-base">{exam.subject}</td>
                            <td className="px-3 md:px-4 py-2 border-b text-sm md:text-base">{exam.date}</td>
                            <td className="px-3 md:px-4 py-2 border-b text-sm md:text-base">
                              {exam.score}/{exam.maxScore} ({exam.percentage}%)
                            </td>
                            <td className={`px-3 md:px-4 py-2 border-b font-bold grade-${exam.grade} text-sm md:text-base`}>
                              {exam.grade}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm md:text-base">No exam results recorded for this student.</p>
                )}
              </div>
              
              <div className="mt-4 md:mt-6">
                <h3 className="text-lg md:text-xl font-semibold text-[#133215] mb-2 md:mb-3">Attendance Summary</h3>
                {getStudentAttendanceSummary(selectedStudentForReport.id).totalCount > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                    <div className="text-center p-3 md:p-4 bg-green-50 rounded">
                      <p className="text-xl md:text-2xl font-bold text-green-700">{getStudentAttendanceSummary(selectedStudentForReport.id).presentCount}</p>
                      <p className="text-xs md:text-sm text-gray-600">Days Present</p>
                    </div>
                    <div className="text-center p-3 md:p-4 bg-red-50 rounded">
                      <p className="text-xl md:text-2xl font-bold text-red-700">{getStudentAttendanceSummary(selectedStudentForReport.id).absentCount}</p>
                      <p className="text-xs md:text-sm text-gray-600">Days Absent</p>
                    </div>
                    <div className="text-center p-3 md:p-4 bg-blue-50 rounded">
                      <p className="text-xl md:text-2xl font-bold text-blue-700">{getStudentAttendanceSummary(selectedStudentForReport.id).attendanceRate}%</p>
                      <p className="text-xs md:text-sm text-gray-600">Attendance Rate</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm md:text-base">No attendance records for this student.</p>
                )}
              </div>
              
              <div className="mt-4 md:mt-6">
                <h3 className="text-lg md:text-xl font-semibold text-[#133215] mb-2 md:mb-3">Overall Performance Analysis</h3>
                <div className="p-3 md:p-4 bg-gray-50 rounded">
                  <p className="text-gray-700 text-sm md:text-base">
                    {selectedStudentForReport.name} has an overall average score of <strong>{getStudentAverage(selectedStudentForReport.id)}%</strong> 
                    across all exams. Attendance rate is <strong>{getStudentAttendanceSummary(selectedStudentForReport.id).attendanceRate}%</strong> 
                    with <strong>{getStudentAttendanceSummary(selectedStudentForReport.id).presentCount}</strong> days present out of 
                    <strong> {getStudentAttendanceSummary(selectedStudentForReport.id).totalCount}</strong> total recorded days.
                  </p>
                  <p className="text-gray-700 mt-2 text-sm md:text-base">
                    {getStudentAverage(selectedStudentForReport.id) >= 80 ? 'Excellent academic performance with strong attendance.' :
                     getStudentAverage(selectedStudentForReport.id) >= 70 ? 'Good academic performance with satisfactory attendance.' :
                     getStudentAverage(selectedStudentForReport.id) >= 60 ? 'Average academic performance with room for improvement.' :
                     'Below average academic performance. Additional support recommended.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Show authentication form if user is not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F3E8D3] to-[#92B775]/20 flex items-center justify-center p-4">
        <div className="w-full max-w-md animate-fadeIn">
          {isAuthLoading ? (
            <div className="text-center">
              <div className="animate-bounce mb-4">
                <div className="w-12 h-12 md:w-16 md:h-16 mx-auto bg-[#133215] rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6 md:w-8 md:h-8 text-[#F3E8D3]" />
                </div>
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-[#133215] mb-2">Track Class</h2>
              <p className="text-gray-600 text-sm md:text-base">Checking authentication...</p>
            </div>
          ) : (
            <AuthForm />
          )}
        </div>
      </div>
    );
  }

  // Loading Animation (only when user is logged in)
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F3E8D3] to-[#92B775]/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-bounce mb-4">
            <div className="w-12 h-12 md:w-16 md:h-16 mx-auto bg-[#133215] rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 md:w-8 md:h-8 text-[#F3E8D3]" />
            </div>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-[#133215] mb-2">Track Class</h2>
          <p className="text-gray-600 text-sm md:text-base">Loading Student Management System...</p>
          <div className="mt-6 md:mt-8 flex justify-center">
            <div className="w-8 h-1 md:w-12 md:h-1 bg-[#133215] rounded-full animate-pulse mx-1"></div>
            <div className="w-8 h-1 md:w-12 md:h-1 bg-[#92B775] rounded-full animate-pulse mx-1" style={{animationDelay: '0.2s'}}></div>
            <div className="w-8 h-1 md:w-12 md:h-1 bg-[#133215]/70 rounded-full animate-pulse mx-1" style={{animationDelay: '0.4s'}}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F3E8D3] to-[#92B775]/20">
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideInUp {
          from { 
            opacity: 0;
            transform: translateY(20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slideInLeft {
          from { 
            opacity: 0;
            transform: translateX(-20px);
          }
          to { 
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
        .animate-slideInUp {
          animation: slideInUp 0.5s ease-out;
        }
        .animate-slideInLeft {
          animation: slideInLeft 0.5s ease-out;
        }
        @media (max-width: 640px) {
          .mobile-menu-slide {
            transform: translateX(0);
          }
        }
      `}</style>

      {/* Navbar */}
      <nav className="bg-[#133215] shadow-lg animate-slideInLeft">
        <div className="max-w-7xl mx-auto px-3 md:px-4">
          <div className="flex items-center justify-between h-14 md:h-16">
            <div className="flex items-center">
              <h1 className="text-[#F3E8D3] text-xl md:text-2xl font-bold">Track Class</h1>
            </div>
            
            <div className="flex items-center space-x-2 md:space-x-4">
              {/* Desktop Navigation */}
              {!isMobile && (
                <div className="flex space-x-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`flex items-center gap-1 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-lg transition transform hover:scale-105 active:scale-95 text-sm md:text-base ${
                          activeTab === item.id
                            ? 'bg-[#F3E8D3] text-[#133215]'
                            : 'text-[#F3E8D3] hover:bg-[#133215]/80'
                        }`}
                      >
                        <Icon className="w-4 h-4 md:w-5 md:h-5" />
                        <span className="font-medium">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              
              {/* User Info and Logout */}
              <div className="flex items-center gap-2">
                <div className="hidden md:block text-right">
                  <p className="text-[#F3E8D3] text-sm font-medium">{user.email}</p>
                  <p className="text-[#F3E8D3]/70 text-xs">Welcome back!</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="text-[#F3E8D3] hover:bg-red-600 p-2 rounded-lg transition transform hover:scale-105 active:scale-95"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
              
              {/* Mobile Menu Button */}
              {isMobile && (
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="text-[#F3E8D3] hover:bg-[#133215]/80 p-2 rounded-lg transition"
                >
                  <Menu className="w-6 h-6" />
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {isMobile && isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 animate-fadeIn">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className="absolute top-14 left-0 right-0 bg-[#133215] shadow-lg animate-slideInUp">
            <div className="flex flex-col">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-3 px-4 py-4 transition ${
                      activeTab === item.id
                        ? 'bg-[#F3E8D3] text-[#133215]'
                        : 'text-[#F3E8D3] hover:bg-[#133215]/80'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium text-lg">{item.label}</span>
                  </button>
                );
              })}
              <div className="border-t border-[#F3E8D3]/20 px-4 py-4">
                <p className="text-[#F3E8D3] text-sm mb-2">{user.email}</p>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 text-[#F3E8D3] hover:bg-red-600 px-4 py-3 rounded-lg transition"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-2 md:px-4 py-4 md:py-8">
        {activeTab === 'home' && renderHome()}
        {activeTab === 'students' && renderStudents()}
        {activeTab === 'attendance' && renderAttendance()}
        {activeTab === 'exams' && renderExams()}
        {activeTab === 'report' && <ReportSection />}
      </main>

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn p-2 md:p-0">
          <div className="bg-[#F3E8D3] rounded-lg p-4 md:p-8 max-w-md w-full mx-2 md:mx-4 animate-slideInUp max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 md:mb-6">
              <h2 className="text-xl md:text-2xl font-bold text-[#133215]">Add New Student</h2>
              <button
                onClick={closeModals}
                className="text-gray-500 hover:text-gray-700 transition"
              >
                <X className="w-5 h-5 md:w-6 md:h-6" />
              </button>
            </div>
            <div className="space-y-3 md:space-y-4">
              <div>
                <label className="block text-gray-700 mb-1 md:mb-2 text-sm md:text-base">Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 md:px-4 py-2 border border-[#92B775] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#133215] bg-white transition text-sm md:text-base"
                  placeholder="Enter student name"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-1 md:mb-2 text-sm md:text-base">Class</label>
                <input
                  type="text"
                  value={formData.class}
                  onChange={(e) => setFormData({...formData, class: e.target.value})}
                  className="w-full px-3 md:px-4 py-2 border border-[#92B775] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#133215] bg-white transition text-sm md:text-base"
                  placeholder="e.g., 10A"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-1 md:mb-2 text-sm md:text-base">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-3 md:px-4 py-2 border border-[#92B775] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#133215] bg-white transition text-sm md:text-base"
                  placeholder="student@school.com"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-1 md:mb-2 text-sm md:text-base">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-3 md:px-4 py-2 border border-[#92B775] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#133215] bg-white transition text-sm md:text-base"
                  placeholder="123-456-7890"
                />
              </div>
            </div>
            <div className="flex gap-2 md:gap-3 mt-4 md:mt-6">
              <button
                onClick={closeModals}
                className="flex-1 px-3 md:px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition transform hover:scale-105 active:scale-95 text-sm md:text-base"
              >
                Cancel
              </button>
              <button
                onClick={handleAddStudent}
                className="flex-1 px-3 md:px-4 py-2 bg-[#133215] text-[#F3E8D3] rounded-lg hover:bg-[#133215]/90 transition transform hover:scale-105 active:scale-95 text-sm md:text-base"
              >
                Add Student
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn p-2 md:p-0">
          <div className="bg-[#F3E8D3] rounded-lg p-4 md:p-8 max-w-md w-full mx-2 md:mx-4 animate-slideInUp max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 md:mb-6">
              <h2 className="text-xl md:text-2xl font-bold text-[#133215]">Edit Student</h2>
              <button
                onClick={closeModals}
                className="text-gray-500 hover:text-gray-700 transition"
              >
                <X className="w-5 h-5 md:w-6 md:h-6" />
              </button>
            </div>
            <div className="space-y-3 md:space-y-4">
              <div>
                <label className="block text-gray-700 mb-1 md:mb-2 text-sm md:text-base">Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 md:px-4 py-2 border border-[#92B775] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#133215] bg-white transition text-sm md:text-base"
                  placeholder="Enter student name"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-1 md:mb-2 text-sm md:text-base">Class</label>
                <input
                  type="text"
                  value={formData.class}
                  onChange={(e) => setFormData({...formData, class: e.target.value})}
                  className="w-full px-3 md:px-4 py-2 border border-[#92B775] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#133215] bg-white transition text-sm md:text-base"
                  placeholder="e.g., 10A"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-1 md:mb-2 text-sm md:text-base">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-3 md:px-4 py-2 border border-[#92B775] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#133215] bg-white transition text-sm md:text-base"
                  placeholder="student@school.com"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-1 md:mb-2 text-sm md:text-base">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-3 md:px-4 py-2 border border-[#92B775] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#133215] bg-white transition text-sm md:text-base"
                  placeholder="123-456-7890"
                />
              </div>
            </div>
            <div className="flex gap-2 md:gap-3 mt-4 md:mt-6">
              <button
                onClick={closeModals}
                className="flex-1 px-3 md:px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition transform hover:scale-105 active:scale-95 text-sm md:text-base"
              >
                Cancel
              </button>
              <button
                onClick={handleEditStudent}
                className="flex-1 px-3 md:px-4 py-2 bg-[#133215] text-[#F3E8D3] rounded-lg hover:bg-[#133215]/90 transition transform hover:scale-105 active:scale-95 text-sm md:text-base"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Exam Modal */}
      {showRecordExamModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn p-2 md:p-0">
          <div className="bg-[#F3E8D3] rounded-lg p-4 md:p-8 max-w-md w-full mx-2 md:mx-4 max-h-[90vh] overflow-y-auto animate-slideInUp">
            <div className="flex justify-between items-center mb-4 md:mb-6">
              <h2 className="text-xl md:text-2xl font-bold text-[#133215]">Record Test/Exam Result</h2>
              <button
                onClick={closeModals}
                className="text-gray-500 hover:text-gray-700 transition"
              >
                <X className="w-5 h-5 md:w-6 md:h-6" />
              </button>
            </div>
            <div className="space-y-3 md:space-y-4">
              <div>
                <label className="block text-gray-700 mb-1 md:mb-2 text-sm md:text-base">Student</label>
                <select
                  value={examFormData.studentId}
                  onChange={(e) => {
                    const selectedStudent = students.find(s => s.id === e.target.value);
                    setExamFormData({
                      ...examFormData,
                      studentId: e.target.value,
                      studentName: selectedStudent ? selectedStudent.name : ''
                    });
                  }}
                  className="w-full px-3 md:px-4 py-2 border border-[#92B775] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#133215] bg-white transition text-sm md:text-base"
                  required
                >
                  <option value="">Select Student</option>
                  {students.map(student => (
                    <option key={student.id} value={student.id}>
                      {student.name} - Class {student.class}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <label className="block text-gray-700 mb-1 md:mb-2 text-sm md:text-base">Exam Name</label>
                  <input
                    type="text"
                    value={examFormData.examName}
                    onChange={(e) => setExamFormData({...examFormData, examName: e.target.value})}
                    className="w-full px-3 md:px-4 py-2 border border-[#92B775] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#133215] bg-white transition text-sm md:text-base"
                    placeholder="e.g., Mid-Term, Final"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-1 md:mb-2 text-sm md:text-base">Subject</label>
                  <select
                    value={examFormData.subject}
                    onChange={(e) => setExamFormData({...examFormData, subject: e.target.value})}
                    className="w-full px-3 md:px-4 py-2 border border-[#92B775] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#133215] bg-white transition text-sm md:text-base"
                    required
                  >
                    <option value="">Select Subject</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Science">Science</option>
                    <option value="English">English</option>
                    <option value="History">History</option>
                    <option value="Physics">Physics</option>
                    <option value="Chemistry">Chemistry</option>
                    <option value="Biology">Biology</option>
                    <option value="Geography">Geography</option>
                    <option value="Computer Science">Computer Science</option>
                    <option value="Art">Art</option>
                    <option value="Music">Music</option>
                    <option value="Physical Education">Physical Education</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 mb-1 md:mb-2 text-sm md:text-base">Date</label>
                <input
                  type="date"
                  value={examFormData.date}
                  onChange={(e) => setExamFormData({...examFormData, date: e.target.value})}
                  className="w-full px-3 md:px-4 py-2 border border-[#92B775] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#133215] bg-white transition text-sm md:text-base"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <label className="block text-gray-700 mb-1 md:mb-2 text-sm md:text-base">Score Obtained</label>
                  <input
                    type="number"
                    value={examFormData.score}
                    onChange={(e) => {
                      const score = e.target.value;
                      setExamFormData({...examFormData, score});
                      if (examFormData.maxScore) {
                        const grade = calculateGrade(score, examFormData.maxScore);
                        setExamFormData(prev => ({...prev, grade}));
                      }
                    }}
                    className="w-full px-3 md:px-4 py-2 border border-[#92B775] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#133215] bg-white transition text-sm md:text-base"
                    placeholder="e.g., 85"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-1 md:mb-2 text-sm md:text-base">Maximum Score</label>
                  <input
                    type="number"
                    value={examFormData.maxScore}
                    onChange={(e) => {
                      const maxScore = e.target.value;
                      setExamFormData({...examFormData, maxScore});
                      if (examFormData.score) {
                        const grade = calculateGrade(examFormData.score, maxScore);
                        setExamFormData(prev => ({...prev, grade}));
                      }
                    }}
                    className="w-full px-3 md:px-4 py-2 border border-[#92B775] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#133215] bg-white transition text-sm md:text-base"
                    placeholder="e.g., 100"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 mb-1 md:mb-2 text-sm md:text-base">Grade</label>
                <input
                  type="text"
                  value={examFormData.grade}
                  readOnly
                  className="w-full px-3 md:px-4 py-2 border border-[#92B775] rounded-lg bg-gray-50 text-sm md:text-base"
                  placeholder="Auto-calculated"
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-1 md:mb-2 text-sm md:text-base">Notes (Optional)</label>
                <textarea
                  value={examFormData.notes}
                  onChange={(e) => setExamFormData({...examFormData, notes: e.target.value})}
                  className="w-full px-3 md:px-4 py-2 border border-[#92B775] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#133215] bg-white transition text-sm md:text-base"
                  placeholder="Add any additional notes or comments"
                  rows="3"
                />
              </div>
            </div>
            <div className="flex gap-2 md:gap-3 mt-4 md:mt-6">
              <button
                onClick={closeModals}
                className="flex-1 px-3 md:px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition transform hover:scale-105 active:scale-95 text-sm md:text-base"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordExam}
                className="flex-1 px-3 md:px-4 py-2 bg-[#133215] text-[#F3E8D3] rounded-lg hover:bg-[#133215]/90 transition transform hover:scale-105 active:scale-95 text-sm md:text-base"
              >
                Record Result
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark Attendance Modal */}
      {showAttendanceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn p-2 md:p-0">
          <div className="bg-[#F3E8D3] rounded-lg p-4 md:p-8 max-w-2xl w-full mx-2 md:mx-4 max-h-[90vh] overflow-y-auto animate-slideInUp">
            <div className="flex justify-between items-center mb-4 md:mb-6">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-[#133215]">Mark Attendance</h2>
                <p className="text-gray-600 text-xs md:text-sm mt-1">Date: {todayDate}</p>
              </div>
              <button
                onClick={closeModals}
                className="text-gray-500 hover:text-gray-700 transition"
              >
                <X className="w-5 h-5 md:w-6 md:h-6" />
              </button>
            </div>
            
            {students.length === 0 ? (
              <div className="text-center py-8 md:py-12">
                <Users className="w-12 h-12 md:w-16 md:h-16 text-gray-300 mx-auto mb-3 md:mb-4" />
                <p className="text-gray-500 text-base md:text-lg">No students available</p>
                <p className="text-gray-400 text-sm mt-2">Add students first to mark attendance</p>
              </div>
            ) : (
              <div className="space-y-2 md:space-y-3">
                {students.map((student, index) => {
                  const currentStatus = getTodayAttendance(student.id);
                  return (
                    <div 
                      key={student.id} 
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3 md:p-4 bg-[#92B775]/20 rounded-lg hover:bg-[#92B775]/30 transition animate-fadeIn gap-2"
                      style={{animationDelay: `${index * 0.05}s`}}
                    >
                      <div>
                        <p className="font-semibold text-gray-900 text-sm md:text-base">{student.name}</p>
                        <p className="text-xs md:text-sm text-gray-600">Class: {student.class}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => markAttendance(student.id, 'Present')}
                          className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg font-medium transition transform hover:scale-105 active:scale-95 text-xs md:text-sm ${
                            currentStatus === 'Present'
                              ? 'bg-green-600 text-white'
                              : 'bg-white text-green-600 border border-green-600 hover:bg-green-50'
                          }`}
                        >
                          Present
                        </button>
                        <button
                          onClick={() => markAttendance(student.id, 'Absent')}
                          className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg font-medium transition transform hover:scale-105 active:scale-95 text-xs md:text-sm ${
                            currentStatus === 'Absent'
                              ? 'bg-red-600 text-white'
                              : 'bg-white text-red-600 border border-red-600 hover:bg-red-50'
                          }`}
                        >
                          Absent
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            <div className="mt-4 md:mt-6">
              <button
                onClick={closeModals}
                className="w-full px-3 md:px-4 py-2 bg-[#133215] text-[#F3E8D3] rounded-lg hover:bg-[#133215]/90 transition transform hover:scale-105 active:scale-95 text-sm md:text-base"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}