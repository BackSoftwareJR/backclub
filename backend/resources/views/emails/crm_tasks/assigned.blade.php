@extends('emails.layouts.backclub')

@section('content')
    <h1>Nuovo Task Assegnato</h1>
    <p>Ciao {{ $assigneeName }},</p>
    <p>Ti è stato assegnato un nuovo task: <strong>{{ $task->title }}</strong>.</p>

    <table class="data-table" role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
            <td class="data-label">Progetto</td>
            <td class="data-value">{{ $project ? $project->name : 'Progetto' }}</td>
        </tr>
        <tr>
            <td class="data-label">Priorità</td>
            <td class="data-value">{{ ucfirst($task->priority ?? 'media') }}</td>
        </tr>
        <tr>
            <td class="data-label">Scadenza</td>
            <td class="data-value">{{ $task->due_date ? \Carbon\Carbon::parse($task->due_date)->format('d/m/Y') : 'Non specificata' }}</td>
        </tr>
    </table>

    @if($task->description)
        <p style="font-size: 14px; color: #86868b; margin-bottom: 5px;">Descrizione</p>
        <p style="background-color: #f5f5f7; padding: 15px; border-radius: 12px; font-size: 14px;">
            {{ Str::limit($task->description, 150) }}
        </p>
    @endif

    <p style="text-align: center; margin-top: 30px;">
        <a href="{{ config('app.url') }}/freelance/task/{{ $task->id }}" class="btn-primary">Vedi Task</a>
    </p>
    <p style="margin-top: 24px;">Grazie per il tuo lavoro!</p>
@endsection
