@extends('emails.layouts.main')

@section('content')
    <h1>Task Completata</h1>
    <p>La task <strong>{{ $task->title }}</strong> è stata segnata come completata da {{ $completer->name }}.</p>
    
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
            <td class="data-label">Completata il</td>
            <td class="data-value">{{ now()->format('d/m/Y H:i') }}</td>
        </tr>
    </table>

    <div style="text-align: center;">
        <a href="{{ config('app.url') }}/dashboard" class="button">Vedi Task</a>
    </div>
@endsection
