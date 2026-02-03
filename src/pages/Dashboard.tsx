import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  CheckSquare, 
  Clock, 
  AlertTriangle, 
  Plus,
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface DashboardStats {
  totalClients: number;
  pendingTasks: number;
  todayTasks: number;
  overdueTasks: number;
}

export default function Dashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    pendingTasks: 0,
    todayTasks: 0,
    overdueTasks: 0,
  });
  const [recentTasks, setRecentTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Fetch clients count
      const { count: clientsCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true });

      // Fetch pending tasks
      const { count: pendingCount } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pendente');

      // Fetch today's tasks
      const { count: todayCount } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('due_date', today)
        .eq('status', 'pendente');

      // Fetch overdue tasks
      const { count: overdueCount } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .lt('due_date', today)
        .eq('status', 'pendente');

      // Fetch recent tasks
      const { data: tasks } = await supabase
        .from('tasks')
        .select('*, clients(name)')
        .order('due_date', { ascending: true })
        .limit(5);

      setStats({
        totalClients: clientsCount || 0,
        pendingTasks: pendingCount || 0,
        todayTasks: todayCount || 0,
        overdueTasks: overdueCount || 0,
      });

      setRecentTasks(tasks || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      label: 'Total de Clientes',
      value: stats.totalClients,
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Tarefas Pendentes',
      value: stats.pendingTasks,
      icon: CheckSquare,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      label: 'Vencem Hoje',
      value: stats.todayTasks,
      icon: Clock,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
    {
      label: 'Atrasadas',
      value: stats.overdueTasks,
      icon: AlertTriangle,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
    },
  ];

  const getStatusBadge = (status: string, dueDate: string) => {
    const today = new Date().toISOString().split('T')[0];
    
    if (status === 'concluida') {
      return <span className="status-badge status-concluida">Concluída</span>;
    }
    if (dueDate < today) {
      return <span className="status-badge status-atrasada">Atrasada</span>;
    }
    if (dueDate === today) {
      return <span className="status-badge bg-accent/15 text-accent">Hoje</span>;
    }
    return <span className="status-badge status-pendente">Pendente</span>;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  return (
    <MainLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Olá, {profile?.name?.split(' ')[0]}! 👋
            </h1>
            <p className="text-muted-foreground mt-1">
              Aqui está o resumo da sua contabilidade
            </p>
          </div>
          <div className="flex gap-3">
            <Button asChild variant="outline">
              <Link to="/clients/new">
                <Plus className="w-4 h-4 mr-2" />
                Novo Cliente
              </Link>
            </Button>
            <Button asChild>
              <Link to="/tasks/new">
                <Plus className="w-4 h-4 mr-2" />
                Nova Tarefa
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="dashboard-grid">
          {statCards.map((stat) => (
            <div key={stat.label} className="stat-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-3xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Tasks */}
        <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
          <div className="p-6 border-b border-border/50 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Próximas Tarefas</h2>
              <p className="text-sm text-muted-foreground">Suas tarefas mais próximas</p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/tasks" className="gap-2">
                Ver todas
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
          
          {recentTasks.length === 0 ? (
            <div className="p-12 text-center">
              <CheckSquare className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Nenhuma tarefa cadastrada</p>
              <Button asChild className="mt-4">
                <Link to="/tasks/new">
                  <Plus className="w-4 h-4 mr-2" />
                  Criar primeira tarefa
                </Link>
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {recentTasks.map((task) => (
                <div key={task.id} className="p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{task.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {task.clients?.name || 'Sem cliente'} • {formatDate(task.due_date)}
                      </p>
                    </div>
                    {getStatusBadge(task.status, task.due_date)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
