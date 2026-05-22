@extends('emails.layouts.main')

@section('content')
    <h1>Nuova Task</h1>
    <p>Ti è stata assegnata una nuova task: <strong>{{ $task->title }}</strong>.</p>
    
    <table class="data-table">
        <tr>
            <td class="data-label">Progetto</td>
            <td class="data-value">{{ $task->project->name }}</td>
        </tr>
        <tr>
            <td class="data-label">Priorità</td>
            <td class="data-value">{{ ucfirst($task->priority) }}</td>
        </tr>
        <tr>
            <td class="data-label">Scadenza</td>
            <td class="data-value">{{ $task->due_date ? \Carbon\Carbon::parse($task->due_date)->format('d/m/Y') : 'Nessuna' }}</td>
        </tr>
    </table>

    @if($task->description)
        <p style="font-size: 14px; color: #86868b; margin-bottom: 5px;">Descrizione</p>
        <p style="background-color: #f5f5f7; padding: 15px; border-radius: 12px; font-size: 14px;">
            {{ Str::limit($task->description, 150) }}
        </p>
    @endif

    <div style="text-align: center; margin-top: 30px;">
        <a href="{{ config('app.url') }}/dashboard" class="button">Vai alla Dashboard</a>
    </div>
@endsection
