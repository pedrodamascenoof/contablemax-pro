import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const taskSchema = z.object({
  title: z.string().min(3, 'Título deve ter no mínimo 3 caracteres'),
  description: z.string().optional(),
  task_type: z.enum(['imposto', 'folha', 'declaracao', 'outro']),
  due_date: z.string().min(1, 'Data de vencimento é obrigatória'),
  client_id: z.string().optional(),
});

type TaskFormData = z.infer<typeof taskSchema>;

interface Client {
  id: string;
  name: string;
}

export default function TaskFormPage() {
  const { id } = useParams();
  const isEditing = !!id;
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEditing);
  const [clients, setClients] = useState<Client[]>([]);

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      task_type: 'outro',
    },
  });

  const taskType = watch('task_type');
  const clientId = watch('client_id');

  useEffect(() => {
    fetchClients();
    if (isEditing) {
      fetchTask();
    }
  }, [id]);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchTask = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        reset({
          title: data.title,
          description: data.description || '',
          task_type: data.task_type as 'imposto' | 'folha' | 'declaracao' | 'outro',
          due_date: data.due_date,
          client_id: data.client_id || undefined,
        });
      }
    } catch (error) {
      console.error('Error fetching task:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao carregar tarefa.',
      });
      navigate('/tasks');
    } finally {
      setFetching(false);
    }
  };

  const onSubmit = async (data: TaskFormData) => {
    if (!user) return;

    setLoading(true);
    try {
      const taskData = {
        title: data.title,
        description: data.description || null,
        task_type: data.task_type,
        due_date: data.due_date,
        client_id: data.client_id || null,
        user_id: user.id,
      };

      if (isEditing) {
        const { error } = await supabase
          .from('tasks')
          .update(taskData)
          .eq('id', id);

        if (error) throw error;

        toast({
          title: 'Tarefa atualizada',
          description: 'As informações foram atualizadas com sucesso.',
        });
      } else {
        const { error } = await supabase
          .from('tasks')
          .insert(taskData);

        if (error) throw error;

        toast({
          title: 'Tarefa criada',
          description: 'A tarefa foi criada com sucesso.',
        });
      }

      navigate('/tasks');
    } catch (error: any) {
      console.error('Error saving task:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message || 'Erro ao salvar tarefa.',
      });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/tasks">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {isEditing ? 'Editar Tarefa' : 'Nova Tarefa'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isEditing ? 'Atualize as informações da tarefa' : 'Preencha os dados da nova tarefa'}
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="form-section space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              {...register('title')}
              placeholder="Título da tarefa"
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Detalhes da tarefa..."
              rows={3}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de tarefa *</Label>
              <Select
                value={taskType}
                onValueChange={(value) => setValue('task_type', value as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="imposto">Imposto</SelectItem>
                  <SelectItem value="folha">Folha de Pagamento</SelectItem>
                  <SelectItem value="declaracao">Declaração</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="due_date">Data de vencimento *</Label>
              <Input
                id="due_date"
                type="date"
                {...register('due_date')}
              />
              {errors.due_date && (
                <p className="text-sm text-destructive">{errors.due_date.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Cliente (opcional)</Label>
            <Select
              value={clientId || ''}
              onValueChange={(value) => setValue('client_id', value || undefined)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Nenhum cliente</SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => navigate('/tasks')}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                isEditing ? 'Atualizar' : 'Criar Tarefa'
              )}
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
