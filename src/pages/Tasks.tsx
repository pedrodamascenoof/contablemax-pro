import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, CheckSquare, Filter, Check } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Task {
  id: string;
  title: string;
  description: string | null;
  task_type: 'imposto' | 'folha' | 'declaracao' | 'outro';
  due_date: string;
  status: 'pendente' | 'concluida' | 'atrasada';
  client_id: string | null;
  clients: { name: string } | null;
}

const taskTypeLabels: Record<string, string> = {
  imposto: 'Imposto',
  folha: 'Folha',
  declaracao: 'Declaração',
  outro: 'Outro',
};

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchTasks();
  }, []);

  useEffect(() => {
    if (statusFilter === 'all') {
      setFilteredTasks(tasks);
    } else {
      const today = new Date().toISOString().split('T')[0];
      let filtered = tasks;
      
      if (statusFilter === 'overdue') {
        filtered = tasks.filter(t => t.status === 'pendente' && t.due_date < today);
      } else {
        filtered = tasks.filter(t => t.status === statusFilter);
      }
      
      setFilteredTasks(filtered);
    }
  }, [statusFilter, tasks]);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*, clients(name)')
        .order('due_date', { ascending: true });

      if (error) throw error;
      setTasks(data || []);
      setFilteredTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao carregar tarefas.',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleTaskComplete = async (task: Task) => {
    try {
      const newStatus = task.status === 'concluida' ? 'pendente' : 'concluida';
      
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', task.id);

      if (error) throw error;

      toast({
        title: newStatus === 'concluida' ? 'Tarefa concluída!' : 'Tarefa reaberta',
        description: task.title,
      });

      fetchTasks();
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao atualizar tarefa.',
      });
    }
  };

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
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Tarefas</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie suas tarefas contábeis
            </p>
          </div>
          <Button asChild>
            <Link to="/tasks/new">
              <Plus className="w-4 h-4 mr-2" />
              Nova Tarefa
            </Link>
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Filtrar:</span>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Todos os status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pendente">Pendentes</SelectItem>
              <SelectItem value="concluida">Concluídas</SelectItem>
              <SelectItem value="overdue">Atrasadas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tasks List */}
        {filteredTasks.length === 0 ? (
          <div className="bg-card rounded-xl border border-border/50 p-12 text-center">
            <CheckSquare className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              {statusFilter !== 'all' ? 'Nenhuma tarefa encontrada' : 'Nenhuma tarefa cadastrada'}
            </p>
            {statusFilter === 'all' && (
              <Button asChild className="mt-4">
                <Link to="/tasks/new">
                  <Plus className="w-4 h-4 mr-2" />
                  Criar primeira tarefa
                </Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTasks.map((task) => (
              <div 
                key={task.id} 
                className={`bg-card rounded-xl border border-border/50 p-4 transition-all hover:shadow-md ${
                  task.status === 'concluida' ? 'opacity-75' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  <button
                    onClick={() => toggleTaskComplete(task)}
                    className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                      task.status === 'concluida'
                        ? 'bg-success border-success text-success-foreground'
                        : 'border-border hover:border-primary'
                    }`}
                  >
                    {task.status === 'concluida' && <Check className="w-3 h-3" />}
                  </button>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className={`font-medium ${task.status === 'concluida' ? 'line-through text-muted-foreground' : ''}`}>
                          {task.title}
                        </h3>
                        {task.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {task.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                          <span>{task.clients?.name || 'Sem cliente'}</span>
                          <span>•</span>
                          <span>{taskTypeLabels[task.task_type]}</span>
                          <span>•</span>
                          <span>{formatDate(task.due_date)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {getStatusBadge(task.status, task.due_date)}
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/tasks/${task.id}/edit`}>Editar</Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
